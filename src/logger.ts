import dateTime from "date-time";

export function logError(errors : any[] = []){
    log("E R R O R", errors)
}

export function log(header : string, message : any[] = []) {
    // logs an event

    console.log("")
    console.log("--"+ dateTime({showMilliseconds: true, local: false}) +"-- " + header + "--------")
    // loops over each element of the and prints them
    message.forEach(element => {
        console.log(element)
    });


    if(message.length > 0){
        console.log("----------- " + header + "   E N D ------------")
        console.log("")
    }
}