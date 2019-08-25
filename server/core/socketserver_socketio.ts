import { EventEmitter } from "events";

var socketio = require('socket.io');
import { Server } from "socket.io"

import * as WebSocket from "ws";
import { logger } from "../shared/log"
import { Core } from "./core"

import * as http from "http";
import * as https from "https";
import { CorePacket } from "../shared/interfaces";
import * as _ from "lodash";

export class SocketServer extends EventEmitter {
    server: http.Server | https.Server;
    io: Server;

    constructor(options: { server: http.Server | https.Server, core: Core }) {
        super();
        this.server = options.server;

        this.io = socketio(this.server);

        this.io.on("connection", (socket: any) => {
            socket.on("join", (path: string, cb?: Function) => {
                var key = path.split("|")
                options.core.user({ apikey: key[0] }, (err, user) => {
                    if (err) {
                        logger.log({ message: "socket join error", data: { path }, level: "error" })
                    }
                    if (user) {
                        socket.user = user;
                        logger.log({ message: "socket join", data: { path }, level: "verbose" })
                        socket.join(path);
                        if (cb) cb();
                    }
                })
            })

            socket.on("post", (packet: any, cb?: Function) => {
                logger.log({ message: "socket post", data: { packet }, level: "verbose" })
                options.core.datapost({ user: socket.user, packet }, (err, result) => {
                    if (result) {
                        if (cb) cb({ result });
                    }
                })
            })

            socket.on("publickey", (path: string, cb?: Function) => {
                logger.log({ message: "socket join publickey", data: { publickey: path }, level: "verbose" })
                socket.join(path);
            })

        })

        this.on("packets", (packet: CorePacket) => {
            if ((packet.apikey) && (packet.id)) {
                this.io.to(packet.apikey).emit("post", packet)
                this.io.to(packet.apikey + "|" + packet.id).emit("post", packet)
            }
        })

        this.on("states", (states: CorePacket) => {
            if ((states.apikey) && (states.id)) {
                let cleanStates = _.clone(states);
                delete cleanStates["apikey"]
                this.io.to(states.apikey).emit("states", cleanStates)
                this.io.to(states.apikey + "|" + states.id).emit("states", cleanStates)

                //public?
                if (states.public) {
                    this.io.to(states.publickey).emit("publickey", cleanStates);
                    this.io.to(states.publickey + "|" + states.id).emit("publickey", cleanStates)
                }
            }
        })

        this.on("users", (user: CorePacket) => {
            if (user.apikey) {
                let cleanUser = _.clone(user);
                delete cleanUser["password"]
                this.io.to(user.apikey).emit("users", cleanUser)
                this.io.to(user.apikey + "|" + user.id).emit("users", cleanUser)
            }
        })

        // websocket:

        // this.wss = new WebSocket.Server({ server: this.server })

        // this.wss.on('connection', (ws) => {
        //     console.log("conn")
        //     ws.on('message', (data) => {
        //         logger.log({ message: "ws received", data: { wsmessage: data }, level: "info" })
        //     });
        //     //ws.send('hello to prototype server');
        // });

    }
}