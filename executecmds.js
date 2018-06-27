
/*
    - check cli args are valid
    - gather required parameters: user,password,httptimeout,delay
    - if -f then makeMultipleReqs(), this represents a file with multiple devices
    - elseif -a then makeReq(), represents a single device
    - --help for information on how to run script
*/
let start = ()=> {
    let http = require('http');
    const util = require('util');
    let fs = require('fs');
    let host = {};
    let conf = {
        user:'',
        password:'',
        httptimeout:8000, // if no response is heard in 20 secs, throw an error
        delay:1000 // timeout between commands sent to the server
    };
    if (process.argv.length >= 6) {
        if (process.argv[2] === "-s") {
            try {
                let settings = fs.readFileSync(process.argv[3], "utf-8");
                settings = settings.split('\r\n');
                for (let i = 0; i < settings.length ;i++) {
                    ele = settings[i].trim().split('=');
                    if (ele.length !== 2)
                        throw new Error("invalid settings file entry "+settings[i]);
                    else
                        conf[ele[0]] = ele[1].trim();
                }
                host = {auth:'Basic ' + new Buffer(conf.user+":"+conf.password).toString('base64')};
                conf.httptimeout = Number(conf.httptimeout);
                conf.delay = Number(conf.delay);
            } catch (err) {
                console.log(err.message);
                process.exit(0);
            }
        }
        if (process.argv[4] === "-a" && process.argv.length === 7) {
            console.log("executing commands on --> "+process.argv[5]);
            console.log("---------------------------------------------------------------------");
            makeReq(process.argv[5],process.argv[6],(data,err)=>{
                if (err) {
                    console.log(err);
                    endmsg = "Script Failed to complete";
                }else if (data) {
                    console.log(data);
                    console.log("---------------------------------------------------------------------");
                }
            });
        } else if (process.argv[4] === "-f") {
            makeMultipleReqs(process.argv[5]);
        } else {
            console.log("Invalid argument "+process.argv[4]);
        }
    } else if (process.argv.length === 3) {
        if (process.argv[2] === '-help')
            console.log("\n how to run:\n",
                "         node scriptname.js -s <settings file> -a <phone ip address> <phone model>\n",
                "         node scriptname.js -s <settings file> -f <filename>\n",
                "         -a     -> indicates ip address for phone and model\n",
                "         -f     -> indicates csv file containing phones/models \n",
                "\n settings file(.txt, see provided settings-sample.txt):\n",
                "         [required] user=<cm user account with control of device(s)>\n",
                "         [required] password=<user password>\n",
                "         [min 1 required] <model>=key1,key2,...,key3, should match model in file name\n",
                "         [optional] httptimeout=<timeout in mili-secs>, default is 8000 msecs\n",
                "         [optional] delay=<delay in mili-secs>, default is 1000 secs\n",
                "\n       settings file example:\n",
                "               user=cisco\n",
                "               password=cisco\n",
                "\n file format(.csv) (phone ip,phone model):\n",
                "         10.x.x.2,88XX\n",
                "         10.x.x.1,79XX\n"); 
    } else {
        console.log("Invalid number of arguments");
    }

    /*
        takes a filename and read's content. 
        each line represents a device ipaddr,model
        call makeReq(ipaddr,model) to execute commands on devices  
    */
    function makeMultipleReqs(filename) {
        fs.readFile(filename,'utf-8',(err,data)=>{
            if (data) {
                data = data.split('\r\n');
                    let helper = (line)=> {
                    line = line.split(",");
                    if (line.length === 2) {
                        console.log("executing commands on --> "+line[0]);
                        console.log("---------------------------------------------------------------------");
                        makeReq(line[0],line[1],(isDone,error)=>{
                            if (error) {
                                console.log(err.message);
                            } else if (isDone) {
                                console.log("---------------------------------------------------------------------");
                                if (data.length !== 0) helper(data.shift());
                            }
                        });
                    }
                };
                helper(data.shift());
            }
        });
    }

    /*
        - check if a delay is needed between commands
        - check if num of commands != 0
        - check if a command is valid
        - proccess commands
    */
    function makeReq(ip,model,cb) {
        let delay = conf.delay;
        let commands = [];
        if (conf[model]) {
            commands = conf[model].split(",");
        } else {
            cb(false,"no commands provided for this model "+model);
            process.exit(0);
        }
        let regex = RegExp(/^[a-zA-Z0-9]+:[a-zA-Z0-9]+$/);
        for (cmd in commands)
            if (!regex.test(commands[cmd])) {
                cb(false,"Invalid command entered "+commands[cmd]);
                process.exit(0);
            }
        
        /*
            - take a command
            - prepare xml request
            - make http request to phone and wait for response
            - if response is successful, wait specified delay (if any..)
            then repeat steps
            - if response fails return error and stop proccessing commands
        */
        let sendCommands = ()=> {
            if (commands.length !== 0) {
                let command = commands.shift();
                console.log("--> sending to "+ip+" "+command);
                let xmlMsg = "<CiscoIPPhoneExecute>"+
                "<ExecuteItem "+"Priority='0' "+"URL='"+command+"'/>"+
                "</CiscoIPPhoneExecute>";
                ipphoneReq(getHttpOptions(ip),"XML="+xmlMsg).then((res)=>{
                    result = "<-- phone response to "+command+":\n"+util.inspect(res,false,null);
                    console.log(result);
                    setTimeout(sendCommands,delay);
                }).catch((err)=>{
                    cb(false,err.message);
                });
            } else {
                cb(true,null);
            }
        };

        sendCommands();
    }

    /*
        - prepare a promise representing an http request
        - set timeout on http request, default is 8000 ms
        - return promise
    */
    function ipphoneReq(httpOptions,xmlData){
        return new Promise((resolve,reject)=>{
            let xml2js = require("xml2js").parseString;
            httpOptions.headers["Content-Length"] = xmlData.length;
            let phoneReq = http.request(httpOptions, function(r) {
                r.setEncoding('utf8');
                r.on('data',(d)=>{
                    xml2js(d,(err,jsonResult)=>{
                        if (err) {
                            reject(new Error(err.message));
                        } else {
                            resolve(jsonResult);
                        }
                    });
                });
            });
            phoneReq.write(xmlData);
            phoneReq.end();
            
            phoneReq.on('socket', function (socket) {
                socket.setTimeout(conf.httptimeout);  
                socket.on('timeout', function() {
                    phoneReq.abort();
                });
            });

            phoneReq.on('error',(err)=>{
                msg = err.message
                if (err.code === "ECONNRESET") msg = "Error: connection timeout";
                reject(new Error(msg));
            });
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

};

start();