import * as webSocket from "ws"
import { connection } from "./ws.js"
import * as randomstring from "randomstring"
import { readFileSync, writeFileSync, } from "fs"
import { formatText, isWhole, removeComments, writeTables } from "./format.js"
import { error, table } from "console"
import { log } from "./logger.js"
import ON_DEATH from "death"

// Read in the settings
var rawData = readFileSync("settings.json", "utf8")
export const settings: {
    token: number, 
    port: number, 
    tokenCharset: string, 
    sendDataBack :boolean, 
    multipleTypesInTable : boolean, 
    messageLenghtMaximum : number,
    writeToken: boolean,
    sendVerificationBack : boolean
} = JSON.parse(removeComments(rawData))


// PORT
const webSocketPort: number = settings.port

// TOKEN
export var token: string

// handles the token setting
if (settings.token > 0 && isWhole(settings.token)) {
    //generates a random Token 
    token = randomstring.generate({ length: settings.token, readable: true, charset: settings.tokenCharset})
} else if (settings.token == 0) {
    // reads the token.txt
    try {

        var t = readFileSync("token.txt", "utf8")
        // formats the token.txt
        token = formatText(t)

    }
    catch (err) {
        // generates a random token cause token.txt wasnt found
        token = randomstring.generate({ length: 20, readable: true, charset: settings.tokenCharset })
        log("Token.txt not found, generated token")
        
        // writes the random token to token.txt
        writeFileSync("token.txt", token)
    }

} else { throw error("invalid token setting") }

// writes out the token if the setting is enabled
if(settings.writeToken){log("TOKEN", ["The token is: " + token])}




// Initializes the "database"
export var tables = new Map<string, unknown[]>()

// Initialize websocket server
export const wss = new webSocket.WebSocketServer({ port: webSocketPort })

wss.on("connection", connection)

// if the server closes or anything happens writes the ta
wss.on("error", writeTables)
wss.on("close", writeTables)
process.on("SIGHUP", writeTables)
ON_DEATH(writeTables)