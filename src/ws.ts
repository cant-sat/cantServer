import * as webSocket from "ws"
import { log, logError } from "./logger.js"
import { tables, token, wss, settings } from "./index.js"
import { ClientRequest } from "http"
import { error, table } from "console"
import { formatText } from "./format.js"

var isThereAuthenticated: boolean = false

export function connection(ws: webSocket.WebSocket, req: ClientRequest) {
    log("Someone Connected to websocket", ["with ip: " + req.socket.remoteAddress])

    // sends the websocket all the existing tables
    tables.forEach((value, key: string) => {
        var table = {
            table: key,
            values: value
        }
        ws.send(JSON.stringify(table))
    })

    // sets the default authentication to false
    var authenticated: boolean = false

    ws.on("message", (data: webSocket.RawData, isBinary: boolean) => {

        if (isThereAuthenticated == false) {

            // authenticates the websocket if they send the token
            if (token == data.toString()) {
                log("Authenticated a websocket")

                authenticated = true
                isThereAuthenticated = true
                return
            }
        }
        // AUTHENTIACETED SENDS MESSAGE
        else if (authenticated == true) {

            //if the message is too long terminates it
            var stringified = data.toString()
            if(stringified.length > settings.messageLenghtMaximum){
                logError(["Message too long"])
                ws.terminate()
                return
            }


            // checks if the thing sent is valid json
            try {
                var newEntrie: { table: string, value: unknown } = JSON.parse(stringified)

                // if the table exists
                if (tables.has(newEntrie.table)) {
                    var values = tables.get(newEntrie.table)
                    if (typeof values[0] == typeof newEntrie.value || settings.multipleTypesInTable) {
                        // adds new value to the table
                        values[values.length] = newEntrie.value
                        tables.set(newEntrie.table, values)
                    }
                    else {
                        throw "all values in the table need to be the same type"
                    }

                }
                //if the table doesnt exist
                else {
                    // Handles errors
                    if (newEntrie.table == null || newEntrie.table != formatText(newEntrie.table) || newEntrie.table.length == 0) {
                        throw "table needs to have value"
                    }
                    if (newEntrie.value == null || newEntrie.table.length == 0) {
                        throw "value needs to have value"
                    }

                    //creates new table
                    tables.set(newEntrie.table, [newEntrie.value])
                    log("created new table: " + newEntrie.table)
                }

                // sends out message to all the websockets
                var i = 0

                //sends new data to all the clients
                wss.clients.forEach((client: webSocket.WebSocket) => {
                    if ((client != ws || settings.sendDataBack) && client.readyState == webSocket.WebSocket.OPEN) {
                        i += 1
                        client.send(JSON.stringify(newEntrie))
                    }

                })

                log("sent out new data", ["to table: " + newEntrie.table, "data: " + newEntrie.value, "to " + i + " number of clients"])
                return

            } catch (err) {
                // throws an error if there is a problem parsing the json
                logError(["Bad message: " + data.toString(), err])
                ws.terminate()
                return
            }

        }

        // Terminates the websocket if it isnt authenticated and tries to send a message
        log("Terminated websocket", ["With ip: " + req.socket.remoteAddress, "Tried sending message: " + data.toString()])
        ws.terminate()
    })



    // Handles closing
    ws.on("close", () => {
        if (authenticated) {
            isThereAuthenticated = false
            log("Terminated websocket", ["With ip: " + req.socket.remoteAddress, "Closed", "Unauthenticated him"])
            authenticated = false
            ws.terminate()
            return
        }

        log("Terminated websocket", ["With ip: " + req.socket.remoteAddress, "Closed"])
        ws.terminate()
    })

    // handles error
    ws.on("error", () => {
        if (authenticated) {
            isThereAuthenticated = false
            log("Terminated websocket", ["With ip: " + req.socket.remoteAddress, "Error occured", "Unauthenticated him"])
            authenticated = false
            ws.terminate()
            return
        }
        log("Terminated websocket", ["With ip: " + req.socket.remoteAddress, "Error occured"])

        ws.terminate()
    })

}