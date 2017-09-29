/*
* run from cli using "node eraseitlfile.js"
*/


let https = require('https');
let http = require('http');
const util = require('util');
let host = {
    auth:'Basic ' + new Buffer('user:pass').toString('base64')
};

function makeReq(model,ip) {
    let commands = [];
    if (model.startsWith("88")) {
        commands.push("Key:Applications");
        commands.push("Key:KeyPad6");
        commands.push("Key:KeyPad4");
        commands.push("Key:KeyPad5");
        commands.push("Key:Soft3");
    } else {
        throw new Error("invalid device model");
    }

    let key = 0;
    let id = setInterval(()=> {
       if (key < commands.length) {
           console.log("sending to "+ip+" "+commands[key]);
           let xmlMsg = "<CiscoIPPhoneExecute>"+
                            "<ExecuteItem "+"Priority='0' "+"URL='"+commands[key++]+"'/>"+
                        "</CiscoIPPhoneExecute>";
           ipphoneReq(getHttpOptions(ip),"XML="+xmlMsg,(resp)=>{
               console.log("req response for "+commands[key-1]+":\n"+util.inspect(resp,false,null));
           });
           //console.log(xmlMsg);
       } else {
           console.log("done sending xml to phone");
           clearInterval(id);
       }
    },2000);

    return "check console";
}

function ipphoneReq(httpOptions,xmlData,callBack){
    let xml2js = require("xml2js").parseString;
    httpOptions.headers["Content-Length"] = xmlData.length;
    let phoneReq = http.request(httpOptions, function(r) {
		//console.log("status code = ", r.statusCode);
		//console.log("headers = " , r.headers);
		r.setEncoding('utf8');
		r.on('data',(d)=>{
			xml2js(d,(err,jsonResult)=>{
				if (err) {
					callback(err);
				} else {
                    callBack(jsonResult);
				}
			});
		});
	});
	phoneReq.write(xmlData);
	phoneReq.end();
	
	phoneReq.on('error',(e)=>{
		callBack(e);
	});
}

function getHttpOptions(ip) {
	let headers = {
		  'Authorization': host.auth, 
		  'Content-Type': 'text/xml; charset=utf-8'
	};
	let options = {
		host: ip,                   
		path: '/CGI/Execute',            
		method: 'POST',            
		headers: headers,           
		rejectUnauthorized: false  
	};
	
	return options;
}

makeReq("8851",'x.x.x.x');
