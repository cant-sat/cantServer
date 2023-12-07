import * as webSocket from "ws"
import { log, logError } from "./logger.js"
import { tables, token, wss, settings } from "./index.js"
import { ClientRequest } from "http"
import { error, table } from "console"
import { formatText, validVariable } from "./format.js"
import { clearInterval } from "timers"

var authenticatedWS: webSocket.WebSocket = null
var chunkInterval: NodeJS.Timeout = null

var sendOut: Map<string, unknown[]> = new Map<string, unknown[]>()

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

        if (authenticatedWS == null) {

            // authenticates the websocket if they send the token
            if (token == data.toString()) {
                log("Authenticated a websocket")

                if (settings.sendVerificationBack) {
                    ws.send("authenticated")
                }
                authenticated = true
                authenticatedWS = ws
                return
            }
        }
        // AUTHENTIACETED SENDS MESSAGE
        else if (authenticated == true) {

            //if the message is too long terminates it
            var stringified = data.toString()
            if (stringified.length > settings.messageLenghtMaximum) {
                logError(["Message too long"])
                ws.terminate()
                return
            }


            // checks if the thing sent is valid json
            try {
                var newEntrie: {
                    table: string,
                    value: unknown,
                    values: [unknown],
                    entries: [{ table: string, value: unknown, values: [unknown] }]
                } = JSON.parse(stringified)

                // handles all the different cases
                if (validVariable(newEntrie.table)) {
                    // handles errors
                    if (validVariable(newEntrie.entries)) {
                        throw "you cant have table and entries"
                    }
                    //checks if value exists but values doesnt
                    else if (validVariable(newEntrie.value) && !validVariable(newEntrie.values)) {
                        addData(newEntrie.table, newEntrie.value)
                    } 
                    //checks if values exists but value doesnt
                    else if (!validVariable(newEntrie.value) && validVariable(newEntrie.values)) {
                        addData(newEntrie.table, newEntrie.values, true)
                    } else {
                        throw "you cant have value and values both or neither"
                    }

                } else if (validVariable(newEntrie.entries) || newEntrie.entries.length > 0) {
                    newEntrie.entries.forEach((entrie: { table: string, value: unknown, values: [unknown] }) => {
                        //checks if value exists but values doesnt
                        if (validVariable(entrie.value) && !validVariable(entrie.values)) {
                            addData(entrie.table, entrie.value)
                        }
                        //checks if values exists but value doesnt 
                        else if (!validVariable(entrie.value) && validVariable(entrie.values)) {
                            addData(entrie.table, entrie.values, true)
                        } else {
                            throw "you cant have value and values both or neither in entries"
                        }
                    })
                } else {
                    // different errors
                    if (newEntrie.entries.length > 0) {
                        throw "entries has to have an element"
                    } else {
                        throw "entries or table has to have a value"
                    }
                }


                // starts the chunk interval
                if(chunkInterval == null && settings.chunkInterval != 0){
                    chunkInterval = setInterval(send, settings.chunkInterval * 1000)
                } else if(settings.chunkInterval == 0){
                    send()
                }

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
            authenticatedWS = null
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
            authenticatedWS = ws
            log("Terminated websocket", ["With ip: " + req.socket.remoteAddress, "Error occured", "Unauthenticated him"])
            authenticated = false
            ws.terminate()
            return
        }
        log("Terminated websocket", ["With ip: " + req.socket.remoteAddress, "Error occured"])

        ws.terminate()
    })

}


function addData(table: string, value: any, isArray : boolean = false) {

    log("try adding data", [table, value])



    // if the value is an array then loops through it
    if (typeof value == typeof [] && isArray) {
        value.forEach((element) => {
            addData(table, element)
        })
        return
    }

    if (tables.has(table) == false) {
        // checks for illegal charachters
        if (table != formatText(table)) {
            throw "illegal charachter in table"
        }

        //creates table
        tables.set(table, [value])
        log("created " + table, ["with value: " + value])

        // adds the value to the sendout
        addToSendOut(table, value)

        return
    }

    var values = tables.get(table)

    if (typeof values[0] == typeof value || settings.multipleTypesInTable) {
        // adds new value to the table
        values[values.length] = value
        tables.set(table, values)

        // adds the value to the sendout
        addToSendOut(table, value)

        return true
    }
    else {
        throw "all values in the table need to be the same type"
    }


}

function send(){
    

    clearInterval(chunkInterval)
    chunkInterval = null

    var temp : {entries : [{table : string, values : unknown[]}]} = {entries : [null]}

    temp.entries.pop()

    sendOut.forEach((value : unknown[], key: string) => {
        temp.entries.push({table : key, values : value})
    })

    console.log(temp)

    var i = 0

    var data = JSON.stringify(temp)

    wss.clients.forEach((client: webSocket.WebSocket) => {
        if ((client != authenticatedWS || settings.sendDataBack) && client.readyState == webSocket.WebSocket.OPEN) {
            i += 1
            client.send(data)
        }

    })

    log("sent out new data", ["to " + i + " number of clients"])

    sendOut = new Map<string, unknown[]>()
}



// adds values to the send out map
function addToSendOut(table : string, value : unknown){
    if(sendOut.has(table)){
        console.log("added to send")

        var add = sendOut.get(table)
        add[add.length] = value

        sendOut.set(table, add)
        return
    } 
    else {

        console.log("created send")
        sendOut.set(table, [value])
    }

}