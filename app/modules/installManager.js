
const cmd = require('node-cmd');
const electron = require('electron');
const DecomressZip = require('decompress-zip');

const regedit = require('regedit');
regedit.setExternalVBSLocation("resources/regedit/vbs");

const path = require('path');
const http = require('http');
const fs = require('fs');
const dialog = electron.dialog;

// 文件资源
let appPath = process.cwd();
let mingwUrl = "http://autovsc-1300748039.cos.ap-shanghai.myqcloud.com/MinGW.zip";
let mingwPackage = appPath + "/resources/MinGW.zip";
let configPackage = electron.app.getAppPath() + "/resources/config.zip";

async function startInstall(compilerPath, projectPath, callback) {
    let win = electron.BrowserWindow.getFocusedWindow();
    changeTitle("正在检查环境");

    let hasVsCode = await checkVsCode();
    if (!hasVsCode) {
        dialog.showMessageBoxSync(win, {
            type: "warning",
            title: "VScode环境异常",
            buttons: ["确认"],
            message: "您可能未安装VScode或在安装时没有将VScode添加到PATH目录。\n这导致本工具无法为您自动安装VScode插件。\n您可以稍后在VScode中手动安装C/C++插件"
        });
    }

    //编译器
    compilerPath = path.normalize(path.join(compilerPath, "mingw"));

    changeTitle("正在下载MinGW");
    try {
        await downloadFile(mingwUrl, mingwPackage);
    }
    catch (error) {
        showError("下载MinGW", error);
    }



    changeTitle("正在配置环境变量");
    try {
        await addInPath(path.join(compilerPath, "bin"));
    }
    catch (error) {
        showError("配置环境变量", error);
    }

    changeTitle("正在解压MinGW");
    try {
        await extractCompiler(compilerPath, win);
    }
    catch (error) {
        showError("解压MinGW", error);
    }

    //工作区解压
    changeTitle("正在配置工作区");
    projectPath = path.normalize(projectPath);
    try {
        await extractConfig(projectPath, win);
    }
    catch (error) {
        showError("解压配置区文件", error);
    }

    //工作区文件修改
    changeTitle("正在完成工作区配置");
    try {
        await replacePathInConfig(projectPath, compilerPath);
    }
    catch(error) {
        showError("修改配置路径", error);
    }

    changeTitle("正在完成");
    win.webContents.send("onCompleted");
    callback();
}

function changeTitle(text) {
    let win = electron.BrowserWindow.getAllWindows()[0];
    win.webContents.send("workChanged", text);
}

async function replacePathInConfig(projectPath, compilerPath) {
    return new Promise((resolve, reject) => {
        try {
            compilerPath = compilerPath.replace(/\\/g,"/");
            let configPath = path.join(projectPath,".vscode");
            let paths = [path.join(configPath,"c_cpp_properties.json"), path.join(configPath,"launch.json")];
            for(let i = 0; i < paths.length; i++) {
                let content = fs.readFileSync(paths[i]).toString();
                content = content.replace(/%%cPath%%/g, compilerPath);
                fs.writeFileSync(paths[i],content);
            }
            resolve();
        }
        catch(error) {
            reject(error);
        }
    });
}

async function downloadFile(source, target) {
    let promise = new Promise((resolve, reject) => {
        try {
            //当前进度
            let cur = 0;
            //文件时间
            let eTagNow = new Date(0);

            //获取目标目录
            let dir = path.dirname(target);

            if (fs.existsSync(dir)) {
                //目录存在，检测文件是否存在
                if (fs.existsSync(target)) {
                    let stat = fs.statSync(target)
                    cur = stat.size;
                    eTagNow = stat.ctime;
                }
            }
            else {
                //目录不存在，创建
                fs.mkdirSync(dir);
            }

            let headers = {
                "If-Range": eTagNow.toUTCString(),
                "Range": "bytes=" + cur + "-"
            }

            http.get(source, {
                headers: headers
            }, (res) => {
                //若返回416则已下载完毕，返回
                if(res.statusCode == 416) {
                    resolve();
                    return;
                }
                //获取总长
                let totalLength = parseInt(res.headers["content-range"].split("/")[1]);
                //获取需要下载的长度
                let nowLength = parseInt(res.headers["content-length"]);
                try {
                    let flag = "w";
                    //若无需重新下载则追加打开文件
                    if (nowLength != totalLength)
                        flag = "a+";

                    let outStream = fs.createWriteStream(target, {
                        flags: flag
                    });

                    let lastTime = new Date();
                    let durationSize = 0;
                    let showSpeed = "";

                    res.pipe(outStream);

                    res.on("data", (chunk) => {
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
                        }

                        changeTitle("正在下载MinGW (" + percent + "%) " + showSpeed);
                    });

                    res.on("close", () => {
                        outStream.close();
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

async function addInPath(path) {
    let promise = new Promise((resolve, reject) => {
        let envPath = "HKCU\\Environment";
        try {
            regedit.list(envPath, (err, result) => {
                if (err) {
                    throw err;
                }

                let pathValue = result[envPath].values.Path.value;

                // 如果path中已经包含目标路径则返回
                if (pathValue.includes(path)) {
                    resolve();
                    return;
                }


                //path不以分号结尾则添加
                if (!pathValue.endsWith(";"))
                    pathValue += ";";

                pathValue += path;

                let valueToInput = {
                    "HKCU\\Environment": {
                        'Path': {
                            value: pathValue,
                            type: 'REG_EXPAND_SZ'
                        }
                    }
                };
                regedit.putValue(valueToInput, (err) => {
                    reject(err);
                });
                resolve();
            });
        }
        catch (err) {
            reject(err);
        }
    });
    return promise;
}

async function extractCompiler(path) {
    let promise = new Promise((resolve, reject) => {
        try {
            let unzipper = new DecomressZip(mingwPackage);
            unzipper.on("progress", (fileIndex, fileCount) => {
                let percent = (fileIndex + 1) / fileCount * 100;
                changeTitle("正在写出MinGW(" + Math.round(percent) + "%)");
            });
            unzipper.on("error", (err) => {
                reject(err);
            });
            unzipper.on("extract", () => {
                //完成解压
                resolve();
            });
            unzipper.extract({
                path: path
            })
        }
        catch (err) {
            reject(err);
        }
    });
    return promise;
}

async function extractConfig(path) {
    let promise = new Promise((resolve, reject) => {
        let unzipper = new DecomressZip(configPackage);
        unzipper.on("progress", (fileIndex, fileCount) => {
            let percent = (fileIndex + 1) / fileCount * 100;
            changeTitle("正在配置工作区(" + Math.round(percent) + "%)");
        });
        unzipper.on("error", (err) => {
            dialog.showErrorBox("被玩坏了", toString(err));
            reject(err);
        });
        unzipper.on("extract", () => {
            //完成解压
            resolve();
        });
        unzipper.extract({
            path: path
        })
    });
    return promise;
}


async function checkVsCode() {
    // eslint-disable-next-line no-unused-vars
    let promise = new Promise((resolve, reject) => {
        // eslint-disable-next-line no-unused-vars
        cmd.get("code --version", (err, data, stdrr) => {
            if (err) {
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
    return promise;
}

function showError(workOn, err) {
    let win = electron.BrowserWindow.getAllWindows()[0];
    let content = "在" + workOn + "时发生了意料之外的错误，配置将无法生效\n以下为捕捉到的错误信息：\n" + err.stack;
    let select = dialog.showMessageBoxSync(win, {
        title: "被玩坏了",
        message: content,
        buttons: ["反馈错误", "结束配置", "忽略"],
        defaultId: 1,
        type: "error"
    });
    if (select == 0) {
        let feedBackInfo = workOn + "\n" + err.stack;
        electron.clipboard.writeText(feedBackInfo, "selection");

        dialog.showMessageBoxSync(win, {
            title: "感谢反馈",
            message: "错误内容已复制到剪贴板。感谢您的反馈！",
            buttons: ["去提交"]
        });

        electron.shell.openExternal("https://github.com/SDchao/AutoVsCEnv2/issues/new");
        electron.app.exit(1);
    }
    else if (select == 1) {
        electron.app.exit(1);
    }
}

let e = {
    startInstall: startInstall
}

module.exports = e;