import React from "react";
import { colors } from "../theme";
import { UserRegistration } from "../components/user_registration";

interface MyProps { }

interface MyState { }

export class RegisterPage extends React.Component<MyProps, MyState> {
    state = {};

    render() {
        var styleregister: any = { ...colors.cardShadow, ...{ maxWidth: "800px", margin: "0 auto" } }
        return (<div>
            <div style={{ padding: colors.padding * 2, zIndex: 3 }}>

                <div style={styleregister}>

                    <div style={{ padding: colors.padding * 2, background: "rgba(0,0,0,0.2)" }}>
                        <h2 style={{ margin: 0, padding: 0 }}>ACCOUNT REGISTRATION</h2>
                    </div>

                    <UserRegistration mode={"register"} />

                    <div style={{
                        ...colors.p, ...{
                            padding: colors.padding * 2,
                            paddingTop: colors.padding * 2,
                            paddingBottom: colors.padding * 3,
                            textAlign: "right",
                            fontSize: "12pt"
                        }
                    }}>
                        Already have an account? Go to <a href="/login">Log in</a>
                    </div>

                    <div style={{ ...colors.p, ...{ background: "rgba(0,0,0,0.2)", padding: colors.padding * 1, textAlign: "right", fontSize: "12pt", } }}>
                        By registering you agree to our <a style={{ whiteSpace: "nowrap" }} href="/terms">Terms of Service</a>.
              </div>

                </div>
            </div>
        </div>)
    }
}
