const https = require('https');
const fs = require('fs');

const packageUrl = "https://raw.githubusercontent.com/SDchao/AutoVsCEnv2/master/app/package.json";


async function hasNewVersion() {
    return new Promise((resolve, reject) => {
        https.get(packageUrl, res => {

            if(res.statusCode != 200)
                reject(new Error(res.statusMessage));

            let content = "";

            res.on('data', (chunk) => {
                content += chunk;
            })

            res.on('close', () => {
                let newest = JSON.parse(content)["version"];
                let now =  fs.readFileSync("../package.json").toJSON()["version"];
                resolve(now < newest);
            })
        })
    })
}

let e = {
    hasNewVersion: hasNewVersion
}

module.exports = e;