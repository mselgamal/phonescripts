main();

/*
* params = {
*    alias:"usera",
*    line: "XXXX",           
* }
* check if user can be imported from LDAP
* if true, then import
* else throw error
* 
* return new Promise();
* reject, if http response code is not 200 or not 201 or an Exception or json response contains errors
* resolve, if http response code is 200 or 201 
*/

function createVM(params) {
    return new Promise((resolve,reject)=>{
        if (!params) reject(new Error("undefined parameters, cant create vm"));
        let template = "usertemplate";
        let uri = "/vmrest/import/users/ldap?query=(alias%20is%20"+params.alias+")";
        getVMObject(uri).then((response)=>{
            let temp = JSON.stringify(response);
            let json = JSON.parse(temp);
            if (json.code === 200) {
                json = JSON.parse(response.data);
            } else if (json.code === 401) {
                reject(new Error("Unity Connection Error: error 401, you dont have rights to upload"));
            } else if (json.code === 503) {
                reject(new Error("Unity Connection Error: error 503, server is busy couldn't proccess the request"));
            } else {
                reject(new Error("Unity Connection Error: "+json.code+" unkown error contact admin"));
            }
            if (json.errors) {
                reject(new Error("Unity Connection Error: "+JSON.stringify(json.errors)));
            } else if (json['@total'] !== '0') {
                uri = "/vmrest/import/users/ldap?templateAlias="+template[params.sitecode];
                json.ImportUser.dtmfAccessId = params.line;
                addVMObject(uri,JSON.stringify(json.ImportUser)).then((res)=>{
                    if (res.code === 201) {
                        resolve(res);
                    } else {
                        let json = JSON.parse(res.data);
                        reject(new Error("Unity Connection Error: "+json.errors.code +", "+j.errors.message));
                    }
                }).catch((err)=>{
                    reject(new Error("Error: "+err.message));
                });
            } else {
                reject(new Error("Unity Connection Error: "+params.alias+" does not exist in ldap"));
            }
        }).catch((err)=>{
            reject(new Error(err.message));
        });
    });
}

// driver function
function main(params) {
    createVM(params).then((res)=>{
        // insert your own logic
    }).catch((err)=>{
        //insert your own logic
    });
}

// send get request to unity server
function getVMObject(query) {
	return voicemailHttpRequest(query,"GET");
}

// add any object to unity server
function addVMObject(uri,body) {
	return voicemailHttpRequest(uri,"POST",undefined,body);
}

// makes http request to unity server
function voicemailHttpRequest(query,httpMethod,custHeader,body) {
	return new Promise((resolve,reject)=> {
		let header = {
		    "Authorization": "creds",   // Basic authentication is expected
	        "Accept": "application/json",
		    "content-type":"application/json"
		}
		let options = {
			host: "x.x.x.x",
			path: query,
			method: httpMethod,
			headers: header,
			rejectUnauthorized: false
		}
		let httpReq = https.request(options, function(r) {
			//console.log("headers = " , r.headers);
			//console.log("headers = " , r.statusCode);
			r.setEncoding('utf8');
			if (httpMethod !== 'DELETE') {
				r.on('data',(d)=>{
					resolve({code:r.statusCode,data:d});
				});
			} else {
				//code 204 means success
				resolve({code:r.statusCode});
			}
		});
		if (httpMethod === 'PUT' || httpMethod === 'POST') {
			httpReq.write(body);
		}
		httpReq.end();
		httpReq.on('error',(err)=>{
			reject(new Error(err.message));
		});
	});
}
