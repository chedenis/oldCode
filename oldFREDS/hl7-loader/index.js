
"use strict";
var csv = require('csv-stream');
var fs = require("fs");
var http = require("http");
var https = require("https");
var url = require("url");
var fileReadStream = fs.createReadStream("./gracedale.hl7.csv");
var querystring = require("querystring");
var util = require("util");

function login(user, password, cb) {
    var options = url.parse("https://auth.freds.cslico.com/api/login");
    options.method = "POST";
    var data = querystring.stringify({
        username: user,
        password: password
    });
    console.log(options);
    var request = https.request(options, function (res) {
        console.log(res.statusCode, res.statusMessage);
        if (res.statusCode === 200) {
            res.on("data", function (chunk) {
                var session = JSON.parse(chunk.toString());
                return cb(null, session);
            });
        }
        else
            return cb(null);
    }).on("error", function (e) {
        return cb(e);
    });
    console.log("writing...", data);
    request.write(data);
    request.end();
}


function postHL7Message(message, authHeader) {
    var options = url.parse("http://fredswebdev.ad.cslico.com:8015/sendHl7toNode");
    options.method ="POST";
    options.headers = {
        "Authorization": "Bearer " + authHeader,
        "Content-Type": "appliction/json"
    };
    var request = http.request(options, function (res) {
        console.log(res.statusCode, res.statusMessage);
    }).on("error", function (err) {
        console.log(err);
    });
    request.write(message);
    request.end();
}

var recordCount = 0;
var recordSkipped = 0;
var csvStream = csv.createStream({ enclosedChar: '"' });
fileReadStream.pipe(csvStream)
    .on('error', function (err) {
        console.log(err);
        process.exit(1);
    })
    .on('data', function (data) {
       // console.log(data);
        if (data.Message && data.Message.length > 20) {
           // var b = new Buffer(data.Message, "base64");
            var jsonMessage =   {
                                "facilityId": 123,
                                "hl7": data.Message//b.toString();
                            }
            var message = JSON.stringify(jsonMessage);
            recordCount = recordCount + 1;
           // console.log("Sending decoded message....", message);
            postHL7Message(message, "1b5426d7-f850-4d19-a36a-e3fa86c42e13");
        } else {
            recordSkipped = recordSkipped + 1;
            console.log("Skipping message...", data.Message);
        }
    })
    .on("end", function () {
        console.log(recordCount, " records processed ", recordSkipped, " records skipped ");
        process.exit(0);
    })
    .on('column', function (key, value) {
    });



// login("abell", "cite802/June", function (err, session) {
//     console.log(util.inspect(err, {colors:true}), util.inspect(session, {colors:true}));
// });
//     

