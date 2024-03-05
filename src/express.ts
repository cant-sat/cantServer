import * as express from "express"
import * as logger from "./logger.js"
import * as fs from "fs"
import { redirects, settings } from "./index.js"
import { validVariable } from "./format.js"

const loaded = []

export function get(req: express.Request, res: express.Response) {
    var redirect: { cache: boolean; fileLocation: string; contentType : string;} = redirects.get(req.url)
    if(validVariable(redirect)){
        if(validVariable(redirect.contentType)){
            res.setHeader("Content-Type", redirect.contentType)
        }

        sendFile(redirect.fileLocation, req, res, redirect.cache)
        return
    }

    sendFile(settings.errorPage.path, req, res, settings.errorPage.cache)
}

export function started() {
    logger.log("Webserver Sucesfully started")
}

function sendFile(path: string, req: express.Request, res: express.Response, stayLoaded: boolean = true): void {

    //checks if the path they are trying to send has already been loaded
    if (loaded[path] && stayLoaded) {
        res.write(loaded[path])
        res.end()
        return
    }

    // reads and sends a file
    fs.readFile(path, (err, data) => {

        //if no error is encountered then sends the file and loads it 
        if (err === null) {
            loaded[path] = data
            res.write(data)
            res.end()
            return
        }

        else {
            logger.logError(["An error accured while trying to read file", "the error happened when ip: " + req.ip, "Made " + req.method + " request to: " + req.path, "error: ", err])
            return
        }
    })
}