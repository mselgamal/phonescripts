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
        req.getVMObject(uri).then((response)=>{
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
                req.addVMObject(uri,JSON.stringify(json.ImportUser)).then((res)=>{
                    if (res.code === 201) {
                        resolve(res);
                    } else {
                        let j = JSON.parse(res.data);
                        reject(new Error("Unity Connection Error: "+j.errors.code +", "+j.errors.message));
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
