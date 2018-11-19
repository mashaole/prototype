import React, { Component } from "react";

export const name = "Account"

export class SettingsPanel extends React.Component {
  state = {
    account: {},
    level: 0
  }
  componentDidMount() {
    fetch("/api/v3/account", { method: "GET" }).then(resp => resp.json()).then((data) => {
      //console.log(data);
      if (data.level) {
        this.setState({ level: data.level })
      }
      this.setState({ account: data })
    })
  }



  render() {
    return (
      <div>
        <div className="adminBlocks" >
          <h4>ACCOUNT</h4>
          <a href="/signout"><button className="btn-spot" style={{ float: "right" }} > SIGN OUT</button></a>
          email: {this.state.account.email}<br />
          level: {this.state.account.level}<br />
          <div style={{ clear: "both" }} />
        </div>
        
      </div>
    )
  }
}


