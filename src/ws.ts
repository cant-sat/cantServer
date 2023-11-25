import * as webSocket from "ws"
import { log, logError } from "./logger.js"
import { tables, token, wss } from "./index.js"
import { ClientRequest } from "http"

var isThereAuthenticated :boolean = false

export function connection(ws : webSocket.WebSocket, req : ClientRequest){
    log("Someone Connected to websocket", ["with ip: " + req.socket.remoteAddress])

    // sends the websocket all the existing tables
    tables.forEach((value : number[], key : string) => {
        var table = {
            name: key,
            values: value
        }
        ws.send(JSON.stringify(table))
    })

    // sets the default authentication to false
    var authenticated : boolean = false

    ws.on("message", (data : webSocket.RawData, isBinary : boolean) => {

        if(isThereAuthenticated == false){

            // authenticates the websocket if they send the token
            if (token == data.toString()){   
                log("Authenticated a websocket")
                
                authenticated = true
                isThereAuthenticated = true
                return
            }
        }
        // AUTHENTIACETED SENDS MESSAGE
        else if(authenticated == true){
            // checks if the thing sent is valid json
            var newValue : {table : string, value : number} = JSON.parse(data.toString())

            // sends out message to all the websockets
            wss.clients.forEach((client : webSocket.WebSocket) => {
                if(client != ws && client.readyState == webSocket.WebSocket.OPEN){
                    client.send(JSON.stringify(data.toString()))
                }
            })
            return
        }

        // Terminates the websocket if it isnt authenticated and tries to send a message
        log("Terminated websocket", ["With ip: "+ req.socket.remoteAddress, "Tried sending message: " + data.toString()])
        ws.terminate()
    })



    // Handles closing
    ws.on("close", () => {
        if(authenticated){
            isThereAuthenticated = false
            log("Terminated websocket", ["With ip: "+ req.socket.remoteAddress, "Closed", "Unauthenticated him"])
            authenticated = false
            ws.terminate()
            return
        }

        log("Terminated websocket", ["With ip: "+ req.socket.remoteAddress, "Closed"])
        ws.terminate()
    })

    // handles error
    ws.on("error", () => {
        if(authenticated){
            isThereAuthenticated = false
            log("Terminated websocket", ["With ip: "+ req.socket.remoteAddress, "Error occured", "Unauthenticated him"])
            authenticated = false
            ws.terminate()
            return
        }
        log("Terminated websocket", ["With ip: "+ req.socket.remoteAddress, "Error occured"])

        ws.terminate()
    })

}