import * as webSocket from "ws"
import { connection } from "./ws.js"
import * as randomstring from "randomstring"
import { readFileSync } from "fs"
import { formatToken, isWhole, removeComments } from "./format.js"
import { error} from "console"
import { log } from "./logger.js"

// Read in the settings
var rawData = readFileSync("settings.json", "utf8")
export const settings : {valuesToStore :number, token : number, port :number, tokenCharset : string}= JSON.parse(removeComments(rawData))


// PORT
const webSocketPort : number = settings.port

// TOKEN
export var token : string

if(settings.token > 0 && isWhole(settings.token)){
    //generates a random Token 
    token = randomstring.generate({length: settings.token, readable: true})
} else if (settings.token == 0) {
    // reads the token.txt
    var t = readFileSync("token.txt", "utf8")
    // formats the token.txt
    token = formatToken(t)

}else {throw error("invalid token setting")}

log("TOKEN", ["The token is: "+ token])

// Initializes the "database"
export const tables = new Map<string, number[]>()

// Initialize websocket server
export const wss = new webSocket.WebSocketServer({port: webSocketPort})

wss.on("connection", connection)