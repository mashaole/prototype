import React, { Component } from "react";
import moment from 'moment'
import socketio from "socket.io-client";

export class DeviceHistory extends React.Component {

    state = {
        timeago: "",
        millisago: 0,
        logdata: [],
        socketConnected: false
    }

    socket;

    constructor(props) {
        super(props)





        //         // p.statesByUsername(this.props.username, (states) => {
        //         //     for (var s in states) {
        //         //         states[s].selected = false
        //         //     }
        //         //     var packet1 = {
        //         //         id: info.newdevice.id,
        //         //         data: info.newdevice.payload.data,
        //         //         timestamp: info.newdevice.payload.timestamp
        //         //     }

        //         //     if (this.state.logData != undefined) {
        //         //         if (this.state.logData[0].timestamp <= packet1.timestamp) {
        //         //             var newd = _.clone(this.state.logData)
        //         //             var n = [];
        //         //             n.push(packet1);
        //         //             for (var count in newd) {
        //         //                 n.push(newd[count]);
        //         //             }
        //         //             this.setState({ logdataNew: n })
        //         //             this.setState({ logData: n })
        //         //         }
        //         //     }
        //         // })
        //     )
        // })
    }


    intervalUpdator = undefined;

    componentWillMount() {
        fetch("/api/v3/packets", {
            method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ log: true })
        }).then(response => response.json()).then(logdata => {
            this.setState({ logdata })
            console.log(logdata);
            //this.props.devices.states(logdata)
        }).catch(err => console.error(err.toString()));

        this.intervalUpdator = setInterval(() => {
            this.updateTime();
        }, 1000 / 10)
    }

    componentDidUpdate = () => {

        if (this.props.account) {
            // we recieved account info from parent
            if (this.state.socketConnected == false) {
                // now we connect.
                this.state.socketConnected = true;
                this.socket = socketio({ transports: ['websocket'] });

                /// ----
                this.socket.on("connect", a => {
                    this.socket.emit("join", this.props.account.apikey)

                    this.socket.on("post", (newDeviceData) => {
                        // so we recieve some data:
                        console.log(newDeviceData);

                        var newlogdata = _.clone(this.state.logdata);
                        newlogdata.unshift(newDeviceData);
                        this.setState({ logdata: newlogdata })
                    })
                })
                /// ----
            } // end if socketConnected
        }
        /// end if account

        // console.log(this.props.devices.states)
        if (this.props.devices.states != undefined) {
            if (this.props.devices.states.length > this.state.logdata.length) {
                this.setState({ logdata: this.props.devices.states })
            }
        }
    }

    blendrgba(x, y, ratio) {
        if (ratio <= 0) {
            return "rgba(" + Math.round(x.r) + "," + Math.round(x.g) + "," + Math.round(x.b) + "," + x.a + ")"
        } else if (ratio >= 1) {
            return "rgba(" + Math.round(y.r) + "," + Math.round(y.g) + "," + Math.round(y.b) + "," + y.a + ")"
        } else {
            var blended = {
                r: (x.r * (1 - ratio)) + (y.r * ratio),
                g: (x.g * (1 - ratio)) + (y.g * ratio),
                b: (x.b * (1 - ratio)) + (y.b * ratio),
                a: (x.a * (1 - ratio)) + (y.a * ratio),
            }
            return "rgba(" + Math.round(blended.r) + "," + Math.round(blended.g) + "," + Math.round(blended.b) + "," + blended.a + ")"
        }
    }

    calcStyle(logdata) {
        var timefade = 3000;
        var lastChange = new Date(logdata.timestamp);
        var millisago = Date.now() - lastChange.getTime();
        var ratio = (timefade - millisago) / timefade;
        if (ratio < 0) { ratio = 0 }
        if (ratio > 1) { ratio = 1 }
        return {
            marginBottom: 2, padding: "0px",
            backgroundImage: "linear-gradient(to right, rgba(16, 26, 38, 0.5)," + this.blendrgba({ r: 3, g: 4, b: 5, a: 0.5 }, { r: 125, g: 255, b: 175, a: 0.75 }, (ratio / 1.5) - 0.35) + ")",
            borderRight: "2px solid " + this.blendrgba({ r: 60, g: 19, b: 25, a: 0 }, { r: 125, g: 255, b: 175, a: 1.0 }, ratio)
        }
    }

    updateTime = () => {
        {
            this.state.logdata.map((logdata, i) => {
                if (logdata.timestamp) {
                    var lastChange = new Date(logdata.timestamp);
                    var millisago = Date.now() - lastChange.getTime();
                    var timeago = moment(logdata.timestamp).fromNow()
                    this.setState({ timeago, millisago })
                }
            })
        }
    }

    render() {

        if (this.state.logdata) {
            var columSize = "110px"

            return (
                <div
                    label={"Logs"}
                    options={this.options}
                    dash={this.props.dash}
                    style={{ height: "100%", overflowY: "scroll", marginTop: "50px" }}
                >
                    {this.state.logdata.map((logdata, i) => {
                        var timeago = moment(logdata.timestamp).fromNow()
                        return ([
                            <div key={i} className="container-fluid" style={{ marginBottom: 2 }}>
                                <div className="row statesViewerItemMap" style={this.calcStyle(logdata)} >
                                    <div style={{ paddingLeft: "20px" }}>
                                        <h3 key={i}>{logdata.id}</h3>
                                        <div className="row dataPreview" style={{ flex: "0 0 " + columSize, textAlign: "right" }}>
                                            <div style={{ textSizeAdjust: "3", paddingRight: "10px" }} key={i}>{JSON.stringify(logdata.data)}</div>
                                        </div>
                                    </div>
                                    <div className="col" align="right" style={{ marginTop: "4px", paddingRight: 10 }}>
                                        <span style={{ fontSize: 12, color: "#fff" }}>{timeago}</span>
                                    </div>
                                </div>
                            </div>
                        ]);
                    })
                    }
                </div>
            )
        } else {
            return (
                <div
                    label={"Logs"}
                    options={this.options}
                    dash={this.props.dash}
                >
                    No data to display
            </div>
            )
        }
    }
}