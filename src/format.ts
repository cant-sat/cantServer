import { mkdirSync, writeFileSync } from "fs";
import { settings, tables } from "./index.js";
import dateTime from "date-time";
import { log } from "./logger.js";

export function removeComments(data: string): string {
    var ret: string = ""
    var lines = data.split('\n');

    // loops throught the lines
    for (var i = 0; i < lines.length; i++) {
        var comment = lines[i].search("//")

        // if there is a comment removes that part
        if (comment != -1) {
            ret += lines[i].substring(0, comment)
        }
        else {
            ret += lines[i]
        }

    }

    return ret
}

export function isWhole(num: number): boolean {
    // num % 1 === 0 checks for a whole number
    if (num % 1 === 0 && num >= 0) {
        return true;
    }

    return false;
};

export function formatText(data: string): string {

    var ret: string = ""

    for (let i = 0; i < data.length; i++) {
        if (settings.tokenCharset.search(data[i]) != -1) {
            ret += data[i]
        }
    }

    return ret
}


export function writeTables() : void{
    var time = dateTime({ local: false, showMilliseconds: false })

    if (tables.size > 0) {
        //tries creating tables
        try { mkdirSync("./tables") } catch { }

        //creates the current table with the current time
        mkdirSync("./tables/" + time)
    } else {
        log("No data to write out")
    }

    tables.forEach((value, key: string) => {
        var table = {
            table: key,
            values: value
        }
        writeFileSync("tables/" + time + "/" + table.table + ".txt", JSON.stringify(table.values), "utf8")
    })

    log("Exitted sucessfully")
    process.exit()
}



export function validVariable(variable : any): boolean{
    if(variable == null || variable == undefined){
        return false
    }
    return true
}