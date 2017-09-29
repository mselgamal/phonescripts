
let https = require('https');
let http = require('http');
const util = require('util');
let host = {
    auth:'Basic ' + new Buffer('user:pass').toString('base64')
};

function makeReq(ip) {
    let commands = [];
    commands.push("Key:Applications");
    commands.push("Key:KeyPad2");
    commands.push("Key:KeyPad1");
    commands.push("delay:5000");
    commands.push("Key:NavRight");
    commands.push("Key:NavRight");
    commands.push("Key:NavRight");
    commands.push("Key:Soft2");
    commands.push("delay:5000");
    commands.push("Key:Soft1");
    commands.push("Key:Soft1");
    
    let key = 0;
    let delay = 1000;
    let id;
    
    let sendCommands = ()=> {
        if (key >= commands.length) {
           console.log("done sending xml to phone");
           clearInterval(id);
           return;   
        }

        let c = commands[key].split(":");
         if (c[0] === "delay") {
            delay = Number(c[1]);
            key++;
            clearInterval(id);
            id = setInterval(sendCommands,delay);
            return;
        } else if (delay > 1000) {
            clearInterval(id);
            delay = 2000;
            id = setInterval(sendCommands,delay);
        }
        
        console.log("sending to "+ip+" "+commands[key]);
        let xmlMsg = "<CiscoIPPhoneExecute>"+
                        "<ExecuteItem "+"Priority='0' "+"URL='"+commands[key]+"'/>"+
                     "</CiscoIPPhoneExecute>";
        ipphoneReq(getHttpOptions(ip),"XML="+xmlMsg,(resp)=>{
            console.log("req response for "+commands[key]+":\n"+util.inspect(resp,false,null));
        }); 
        key++;
    };

    id = setInterval(sendCommands,delay);
}

function ipphoneReq(httpOptions,xmlData,callBack){
    let xml2js = require("xml2js").parseString;
    httpOptions.headers["Content-Length"] = xmlData.length;
    let phoneReq = http.request(httpOptions, function(r) {
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

makeReq("x.x.x.x");
