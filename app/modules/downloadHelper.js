const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

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
    let trueUrl = await getLanzouDownloadUrl(source);
    console.log(trueUrl);
    let promise = new Promise((resolve, reject) => {
        try {
            //当前进度
            let cur = 0;
            // 临时文件
            let tempPath = target + ".tmp";
            //获取目标目录
            let dir = path.dirname(target);

            if (!fs.existsSync(dir)) {
                //目录不存在，创建
                fs.mkdirSync(dir);
            }


            https.get(trueUrl, (res) => {
                try {
                    //若返回异常
                    if (res.statusCode != 200) {
                        reject(new Error("Error downloading\n" + res.statusCode + res.statusMessage));
                        return;
                    }
                    //获取需要下载的长度
                    let totalLength = parseInt(res.headers["content-length"]);

                    //获取现在文件的长度
                    let fileLength = 0;
                    if (fs.existsSync(target)) {
                        fileLength = fs.statSync(target).size;
                        //若文件与需要下载的长度相同，返回
                        if (fileLength == totalLength) {
                            resolve();
                            return;
                        }
                        fs.unlinkSync(target);
                    }

                    let outStream = fs.createWriteStream(tempPath, {
                        flags: "w"
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
                        if (duration > 500) {
                            let speed = (durationSize / 1024) / (duration / 1000); // kB/s

                            if (speed > 1024) {
                                showSpeed = (speed / 1024).toFixed(2) + " MB/s";
                            }
                            else {
                                showSpeed = speed.toFixed(2) + " KB/s";
                            } 

                            lastTime = nowTime;
                            durationSize = 0;

                            processCallBack(percent, showSpeed);    
                        }
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
    downloadFileFromLanzou: downloadFileFromLanzou
}

module.exports = e;