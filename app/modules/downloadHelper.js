const path = require('path');
const fs = require('fs');
const {http, https} = require("follow-redirects");

async function getLanzouDownloadUrl(shareUrl) {
    return new Promise((resolve, reject) => {
        let apiUrl = "http://api.iiwl.cc/lz/?url=" + shareUrl;

        http.get(apiUrl, (res) => {
            let html = "";
            //若返回异常
            if (res.statusCode != 200) {
                reject(new Error("Error getting true url\n" + res.statusCode + res.statusMessage));
                return;
            }
            
            res.on('data', (data)=> {
                html += data;
            });

            res.on('end', () => {
                let json = JSON.parse(html);
                resolve(json.downUrl);
            });
            res.on("error", (error) => {
                reject(error);
            })
        });
    });
}

async function downloadFileFromLanzou(source, target, processCallBack) {
    source = getLanzouDownloadUrl(source);
    return await downloadFile(source,target,processCallBack);
}

async function downloadFile(sourece, target, processCallBack) {
    let promise = new Promise((resolve, reject) => {
        try {
            //当前进度
            let cur = 0;
            // 临时文件
            let tempPath = target + ".tmp";
            //获取目标目录
            let dir = path.dirname(target);
            // 若文件存在，则直接返回
            if(fs.existsSync(target)) {
                resolve();
                return;
            }
                

            if (!fs.existsSync(dir)) {
                //目录不存在，创建
                fs.mkdirSync(dir);
            }

            // 获取现在临时文件长度
            if(fs.existsSync(tempPath)) {
                cur = fs.statSync(tempPath).size;
            }

            // 若文件存在则获取

            https.get(sourece,{
                headers: {
                    "Range" : "bytes=" + cur + "-"
                }
            },(res) => {
                try {
                    //若返回异常
                    if (res.statusCode != 206) {
                        reject(new Error("Error downloading\n" + res.statusCode + res.statusMessage));
                        return;
                    }

                    // 获取content-range
                    let contentRange = res.headers["content-range"];

                    //获取需要下载的长度
                    let totalLength = contentRange.split("/")[1];

                    let outStream = fs.createWriteStream(tempPath, {
                        flags: "a+"
                    });


                    let lastTime = new Date();
                    let durationSize = 0;
                    let showSpeed = "";

                    res.pipe(outStream);

                    res.on("data", (chunk) => {
                        try{
                        cur += chunk.length;
                        durationSize += chunk.length;

                        let percent = (cur / totalLength * 100).toFixed(0);

                        let nowTime = new Date();
                        let duration = nowTime.getTime() - lastTime.getTime();
                        if (duration > 1000) {
                            let speed = (durationSize / 1024) / (duration / 1000); // kB/s

                            if (speed > 1024) {
                                showSpeed = (speed / 1024).toFixed(2) + " MB/s";
                            }
                            else {
                                showSpeed = speed.toFixed(2) + " KB/s";
                            } 

                            lastTime = nowTime;
                            durationSize = 0;  
                        }
                        processCallBack(percent, showSpeed); 
                    } catch(err) {
                        console.log(err);
                    }
                    });

                    res.on("close", () => {
                        outStream.close();
                        fs.renameSync(tempPath, target);
                        resolve();
                    });
                } catch (err) {
                    reject(err);
                }
            })

        }
        catch (err) {
            reject(err);
        }
    });
    return promise;
}

let e = {
    downloadFileFromLanzou: downloadFileFromLanzou,
    downloadFile: downloadFile
}

module.exports = e;