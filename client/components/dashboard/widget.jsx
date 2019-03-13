import React, { Component } from "react";

export class OptionsInput extends React.Component {

  state = {
  }

  apply() {
    console.log("apply")
  }

  onKeyPress = (e) => {
    if (e.key == "Enter") {
      this.apply();
    }
  }

  render() {
    return (<div className="widgetMenuItem" onDrag={this.noDrag}
      onDragStart={this.noDrag} >
      {this.props.option.name}:
      <input
        type="value"
        defaultValue={this.props.option.value}
        onKeyPress={this.onKeyPress}
        onChange={this.changeValue} >
      </input>
    </div>)
  }
}

export class Widget extends React.Component {

  state = {
    menuVisible: false,
    boundaryVisible: false
  }



  removeWidget = () => {
    if (this.props.dash.remove) { this.props.dash.remove() }
  }

  optionsPanel = () => {
    if (this.props.options) {
      return (<div>{this.props.options.map((option, i) => {

        if (option.type == "input") {
          return (<OptionsInput key={i} option={option} />)
        }

        return (<div key={i}></div>)

      })}</div>)
    } else {
      return (<div className="widgetMenuItem">Widget has no options.</div>)
    }

  }

  menu() {
    if (this.state.menuVisible) {
      return (<div className="widgetMenu" style={{
        position: "absolute",
        zIndex: 100,
        width: 200,
        fontSize: 14
      }} >
        <div className="widgetMenuItem widgetMenuItemButton" onClick={this.removeWidget} >
          <i className="fas fa-trash-alt"></i> REMOVE</div>

        <div className="widgetMenuItem" >Change Type:
          <select onChange={(e) => {
            // console.log(e.target.value);
            this.props.dash.change("type", e.target.value)
          }}>

            {/* You can add widgets to the dropdown below:
                Please keep the below names the same as the .jsx file for the widget for sanity. */}
            <option unselectable="true">select</option>
            <option>Calendar</option>
            <option>NivoLine</option>
            <option>ChartLine</option>
            <option>Blank</option>
            <option>ThreeDWidget</option>
            <option>Gauge</option>
            <option>map</option>
            <option>button</option>
            <option>widgetButton</option>
          </select></div>

        {this.optionsPanel()}
      </div>)
    } else {
      return null;
    }
  }

  showMenu = () => {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.state.menuVisible) {
        this.setState({ menuVisible: false })
      } else {
        this.setState({ menuVisible: true })
      }
    }
  }

  onDrag = (e) => {

    e.preventDefault();
    e.stopPropagation();

  }

  showBoundary = () => {
    if (this.state.boundaryVisible == false) {
      this.props.showBoundary(true);
      this.setState({ boundaryVisible: true })
    } else if (this.state.boundaryVisible == true) {
      this.props.showBoundary(false);
      this.setState({ boundaryVisible: false })
    }
  }

  // This must move into the map widget!
  //
  // mapWidget = () => {
  //   var p = this.props.children.type;
  //   var color = "";

  //   if (this.props.children.type.name == "MapDevices") {
  //     if (this.state.boundaryVisible == true) {
  //       color = "white";
  //     } else {
  //       color = "grey";
  //     }
  //     return (
  //       <div className="widgetOptionsButton" style={{ padding: "4px 6px 4px 6px", color: color }} ><i className="fas fa-route" title="Show Boundary" onClick={this.showBoundary}></i></div>
  //     )
  //   } else {
  //     return;
  //   }
  // }

  getwidgetoptions = (options) => {
    this.setState({ options })
  }

  render = () => {
    return (
      < div style={{ overflow: "hidden" }
      } style={{ height: "100%", position: "relative", paddingTop: 30 }}>

        <div className="widgetTitleBar" >
          <div className="widgetGrab" >{this.props.label} </div>
          <div className="widgetOptions">
            <div className="widgetOptionsButton" style={{ padding: "4px 6px 4px 6px" }} ><i className="fas fa-wrench" onDrag={this.onDrag} onClick={this.showMenu()}></i></div>
            {this.menu()}
          </div>
        </div>

        <div className="widgetContents" style={{ height: "100%" }}>
          {this.props.children}
        </div>

        <div style={{ clear: "both" }}></div>
      </div >
    )
  }

}