const https = require('https');

const packageUrl = "https://gitee.com/SDchao/AutoVsCEnv2/raw/master/app/package.json";


async function hasNewVersion() {
    return new Promise((resolve, reject) => {
        try {
            https.get(packageUrl, res => {

                if (res.statusCode != 200)
                    reject(new Error(res.statusMessage));

                let content = "";

                res.on('data', (chunk) => {
                    content += chunk;
                })

                res.on('close', () => {
                    let newest = JSON.parse(content)["version"];
                    let now = require("../package.json").version;
                    console.log(newest, now);
                    resolve(now < newest);
                })
            })
            .on("error", (err) => {
                reject(err);
            });
        }
        catch (err) {
            reject(err);
        }
    })
}

let e = {
    hasNewVersion: hasNewVersion
}

module.exports = e;