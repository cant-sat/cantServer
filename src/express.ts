import { log } from "console"
import * as express from "express"

export function get(req : express.Request, res : express.Response){
    console.log(req.url)
}

export function started(){
    log("Server succesfully started")
}