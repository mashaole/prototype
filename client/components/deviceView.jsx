import React, { Component } from "react";

import SyntaxHighlighter from "react-syntax-highlighter";
import { tomorrowNightBright } from "react-syntax-highlighter/styles/hljs";
import * as $ from "jquery";


import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faHdd, faEraser } from "@fortawesome/free-solid-svg-icons";
import { DevicePluginPanel } from "../plugins/iotnxt/iotnxt_device.jsx";

import { DataView } from "./dataView.jsx"

import moment from 'moment'

library.add(faHdd);
library.add(faTrash);
library.add(faEraser);

import MonacoEditor from "react-monaco-editor";

import * as p from "../prototype.ts"
import Dashboard from "./dashboard/dashboard.jsx"
export class Editor extends React.Component {

  loadingState = 0;

  state = {
    message: "",
    messageOpacity: 0,
    loaded: 0,
    code: `// uncomment below to test "workflow" processing
// packet.data.test = "hello world"
callback(packet); `
  };

  saveWorkflow = () => {


    fetch("/api/v3/workflow", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: this.props.deviceId, code: this.state.code })
    })
      .then(response => response.json())
      .then(serverresponse => {
        this.setState({ message: serverresponse.result, messageOpacity: 1.0 });
        setTimeout(() => {
          this.setState({ messageOpacity: 0 });
        }, 1000);
      })
      .catch(err => console.error(err.toString()));
  };

  componentDidMount = () => {
    


    document.addEventListener("keydown", e => {
      if (e.key.toLowerCase() == "s") {
        if (e.ctrlKey) {
          e.preventDefault();

          
          this.saveWorkflow();
        }
      }
    });
  };

  loadLastPacket = (devid, cb) => {
    console.log("loadLastPacket")
    fetch("/api/v3/packets", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: devid, limit: 1 })
    })
      .then(response => response.json())
      .then(packets => {
        if (packets.length > 0) {
          this.setState({lastPacket:packets[0]})
          this.setState({packets:packets})
        } else {
          this.setState({packets:[]})
          this.setState({lastPacket:{}})
        }
      })
      .catch(err => console.error(err.toString()));
  };

  loadState = (devid, cb) => {
    fetch("/api/v3/state", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: devid })
    })
      .then(response => response.json())
      .then(data => {
        this.setState({ lastState: data });
        cb(undefined, data);
      })
      .catch(err => console.error(err.toString()));
  };

  loadStates = cb => {
    fetch("/api/v3/states/full", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    })
      .then(response => response.json())
      .then(data => {
        //same as workflow
        var statesObj = {};
        for (var s in data) {
          statesObj[data[s].devid] = data[s];
        }
        this.setState({ lastStates: data, lastStatesObj: statesObj });        
        this.loadPluginDefinitions((e,pluginDefinitions)=>{
          cb(undefined, { lastStates: data, lastStatesObj: statesObj, pluginDefinitions });
        })
        
      })
      .catch(err => console.error(err.toString()));
  };


  loadPluginDefinitions = cb => {
    fetch("/api/v3/plugins/definitions",{
      method: "GET", 
      headers: {
        Accept: "application/json",
        "Content-Type":"application/json"
      }
    }).then(response => response.json()).then(data => {
      this.setState({ pluginDefinitions : data });
      cb(undefined,data);      
    }).catch( (err) => {
      //console.error(err.toString())
      cb(undefined,[]);
    });
  }

  awaitData = (data, cb) => {

    var checker = setInterval(()=>{
      if (data === undefined) {

      } else {
        clearInterval(checker);
        cb(data);
      }
    },0)
  }

  editorDidMount = (editor, monaco) => {
    editor.focus();

    //fetch('/themes/Monokai.json')
    fetch("/themes/prototyp3.json")
      .then(data => data.json())
      .then(data => {
        monaco.editor.defineTheme("prototyp3", data);
        monaco.editor.setTheme("prototyp3");
      });

    
    this.loadStates((err, resp) => {
      // extra libraries

      var definitions = [
        "declare var packet = " + JSON.stringify(this.state.lastPacket),
        "const state = " + JSON.stringify(this.state.lastState),
        "const states = " + JSON.stringify(resp.lastStates),
        "const statesObj = " + JSON.stringify(resp.lastStatesObj),
        "declare var iotnxt = { register : ()=>{}, somenewapicall: ()=>{} }",
        "declare function callback(packet:any)",
        "declare class Facts {",
        "    /**",
        "     * Returns the next fact",
        "     */",
        "    static next():string",
        "}"
      ]

      definitions = definitions.concat(resp.pluginDefinitions.definitions);
      

      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        definitions.join("\n"),
        "filename/facts.d.ts"
      );
    });

    window.addEventListener("resize", () => {
      editor.layout();
    });
  };

  onChange = (code, e) => {
    this.setState({ code: code });
  };

  loadOnFirstData = () => {

    
    if (this.props.deviceId) {
      if (this.loadingState === 0 ) {
        this.loadingState = 1
        this.loadState(this.props.deviceId, ()=>{});
        this.loadLastPacket(this.props.deviceId)
      }
    }

    if (this.props.state) {
      if (this.props.state.workflowCode) {
        //console.log("got state! got code");

        if (this.state.loaded == 0) {
          var code = this.props.state.workflowCode;
          this.setState({ loaded: 1 });
          this.setState({ code });
        } else {
          //console.log("already loaded code!")
        }
      } else {
        //console.log("got state! no workflow");
      }
    }
  };

  ///https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-adding-an-action-to-an-editor-instance

  render() {
    this.loadOnFirstData();

    if ((this.state.lastState === undefined) || (this.state.lastPacket === undefined)) {
      
      return (
        <div>Editor Loading</div>
      )

    } else {

      const options = {
        selectOnLineNumbers: false,
        minimap: { enabled: false}
      };
      return (
        <div>
          <div>
            <div
              className="commanderBgPanel commanderBgPanelClickable"
              style={{
                width: 160,
                marginBottom: 20,
                float: "left",
              }}
              onClick={this.saveWorkflow}
            >
              <FontAwesomeIcon icon="hdd" /> SAVE CODE
            </div>
  
            <div
              style={{
                transition: "all 0.25s ease-out",
                opacity: this.state.messageOpacity,
                width: 110,
                marginTop: 20,
                marginBottom: 20,
                float: "left",
                textAlign: "left",
                paddingLeft: 20
              }}
            >
              {this.state.message}
            </div>
  
            <div style={{ clear: "both" }} />
          </div>
  
          <div>
            <span title="Check to your left under packet history">packet</span>
            &nbsp;
            <span title={JSON.stringify(this.state.lastState, null, 2)}>
              state
            </span>
            &nbsp;
            <span title={JSON.stringify(this.state.lastStates, null, 2)}>
              states
            </span>
            &nbsp;
            <span title={JSON.stringify(this.state.lastStatesObj, null, 2)}>
              statesObj
            </span>
            &nbsp;
          </div>
  
          <div style={{backgroundColor:"black"}}>
            <MonacoEditor
              width="800"
              height="420"
              language="javascript"
              theme="vs-dark"
              value={this.state.code}
              options={options}
              onChange={this.onChange}
              editorDidMount={this.editorDidMount}
              
            />
          </div>
        </div>
      );

    }

    
  }
}



export class DeviceView extends Component {
  state = {
    devid: undefined,
    lastTimestamp: "no idea",
    packets: [],
    socketDataIn: {},
    getPackets: false,
    trashClicked: 0,
    trashButtonText: "DELETE DEVICE",
    clearStateClicked : 0,
    eraseButtonText: "CLEAR STATE",
    view : undefined,
    state : undefined,
    apiMenu : 1
  };

  constructor(props) {
    super(props);

    this.state.devid = props.devid
    
  }


  updateTime = () => {
    if (this.props.view) {
      if (this.props.view.timestamp) {
        var timeago = moment(this.props.view.timestamp).fromNow()
        this.setState({timeago})
      }
    }    
  }


  componentDidMount = () => {
    this.updateTime();
    setInterval( () => {
      this.updateTime();
    },500)

    p.getView(this.props.devid, (view)=>{
      console.log(view)
      this.setState({view})
    })

    p.getState(this.props.devid, (state) => {
      console.log(state)
      this.setState({ state })
    })

  }

  getName() {
    return "device name/id";
  }

  latestTimestamp() {
    return "no idea";
  }

  deleteDevice = () => {
    // deletes a device's state and packet history
    if (this.state.trashClicked == 0) {
      var trashClicked = this.state.trashClicked;
      this.setState({ trashClicked: 1 });
      this.setState({ trashButtonText: "ARE YOU SURE?" });
      console.log("clicked once");
      return;
    }

    if (this.state.trashClicked == 1) {
      console.log("clicked twice");
      $.ajax({
        url: "/api/v3/state/delete",
        type: "post",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify(this.props.view),
        success: result => {
          window.location.href = window.location.origin;
        }
      });
    }
  };

    getMenuClasses = function (num ) {
    if (num == this.state.apiMenu) {
      return "menuTab borderTopSpot"
    } else {
      return "menuTab menuSelectable"
    }
  }

  getMenuPageStyle = function (num ) {
    if (num == this.state.apiMenu) {
      return { display: "" }
    } else {
      return { display: "none" }
    }
  }

  onClickMenuTab = function (num) {
    return (event) => {
      /*
      console.log(event);
      event.currentTarget.className = "col-md-2 menuTab borderTopSpot";
      console.log(num)
      */
     var apiMenu = num;
   this.setState({ apiMenu });
  this.forceUpdate();
   
    
    }
  }

  clearState = () => {
    //clears state, but retains history and workflow

    if (this.state.clearStateClicked == 0) {
      this.setState({ clearStateClicked: 1 });
      this.setState({ eraseButtonText: "ARE YOU SURE?" });
      console.log("clicked once");
      return;
    }

    if (this.state.clearStateClicked == 1) {
      console.log("clicked twice");
      $.ajax({
        url: "/api/v3/state/clear",
        type: "post",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify(this.props.view),
        success: result => {
          window.location.href = window.location.href;
        }
      });
    }
  };


  render() {
    var devid = "loading";
    var lastTimestamp = "";
    var packets = [];
    var socketDataIn = "socketDataIn";
    //console.log(this.props);

    var latestState = {};

    let plugins;

    if (this.state.view) {
      latestState = this.state.view;

      if (this.state.view.id) {
        plugins = <DevicePluginPanel stateId={this.state.view.id} />;
      } else {
        plugins = <p>plugins loading</p>;
      }
    }



    if (this.state.packets) {
      packets = this.state.packets;
    }

    return (
<div style={{}}>
  
<div><Dashboard view= {this.state.view}/></div>
     
  <div className="commanderBgPanel" style={{ margin: 10}}>
        <div
          className="row"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            marginBottom: 10,
            paddingBottom: 1,
           
          }}
        >
          <div className="col-md-8">
            
            <h3>{this.state.devid}</h3>
           
            <span className="faded" >{this.state.timeago}</span>
          </div>


          <div className="col-md-4">
          
          
            <div
              className="commanderBgPanel commanderBgPanelClickable"
              style={{ width: 200, float: "right", height: 64 }}
              onClick={this.deleteDevice}><FontAwesomeIcon icon="trash" /> {this.state.trashButtonText}</div>

            <div className="commanderBgPanel commanderBgPanelClickable" 
              style={{ width: 175, float: "right", marginRight: 10 }}
              onClick={this.clearState}><FontAwesomeIcon icon="eraser" /> {this.state.eraseButtonText}</div>

          </div>
       
        </div>
<div  >
   <div className="row"  > 
 
       <div className={this.getMenuClasses(1)} onClick={this.onClickMenuTab(1) }>EDITOR</div>
         
      
          <div className={this.getMenuClasses(3)} onClick={this.onClickMenuTab(3) }>PLUGINS</div></div>
          </div>
        <div
          className="row"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            marginBottom: 20,
            paddingBottom: 10,
            backgroundColor : "rgba(0, 3, 5, 0.5)",
          
          }}
        >
        <div className="col-11" style={this.getMenuPageStyle(1)}>
       
          <div className="" >
          <hr></hr>
            <h4 className="spot">DEVICE DATA</h4>
           <div style={{float : "left"}} > <DataView data={latestState} />
           <h4 className="spot">LATEST STATE</h4>
            <div style={{maxHeight: 450, overflowY: "scroll", marginBottom: 20, padding: 0, height:300}}><SyntaxHighlighter language="javascript" style={tomorrowNightBright} >{JSON.stringify(latestState, null, 2)}</SyntaxHighlighter></div>
           </div>


            
                      

          </div>
          <div style={{float : "right" }}> <Editor deviceId={this.state.devid} state={this.props.state} /> </div>
          </div>
     




          <div className=" col-md-12 "  style={this.getMenuPageStyle(3)}>
            <div><center >
              <hr></hr>
              <h4 className="spot">PLUGINS</h4>
              <p>Plugin options unique to this device:</p>
              {plugins}
              </center>
            </div>
          </div>

        </div>
</div>
      </div>
     
    );
  }
}