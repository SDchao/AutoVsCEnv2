/* eslint-disable no-unused-vars */
const cmd = require('node-cmd');
const electron = require('electron');
const DecomressZip = require('decompress-zip');
const regedit = require('regedit');
const path = require('path');
const dialog = electron.dialog;

// 文件资源
let appPath = process.cwd();
let mingwPackage = appPath + "/res/MinGW.zip";
let configPackage = appPath + "/res/config.zip";

async function startInstall(compilerPath, projectPath) {

    compilerPath = path.normalize(path.join(compilerPath, "mingw"));
    let win = electron.BrowserWindow.getFocusedWindow()
    win.webContents.send("workChanged", "正在检查环境");

    let hasVsCode = await checkVsCode();
    if (!hasVsCode) {
        dialog.showMessageBoxSync(win, {
            type: "warning",
            title: "VScode环境异常",
            buttons: ["确认"],
            message: "您可能未安装VScode或在安装时没有将VScode添加到PATH目录。\n这导致本工具无法为您自动安装VScode插件。\n您可以稍后在VScode中手动安装C/C++插件"
        });
    }
    win.webContents.send("workChanged", "正在配置环境变量");
    try {
        await addInPath(path.join(compilerPath, "bin"));
    }
    catch (error) {
        throw new Error(error);
    }

    win.webContents.send("workChanged", "正在写出MinGW");
    try {
        await extractCompiler(compilerPath, win);
    }
    catch (error) {
        dialog.showErrorBox("被玩坏了", error.stack);
    }

    win.webContents.send("workChanged", "正在配置工作区");
    projectPath = path.normalize(projectPath);
    try {
        await extractConfig(projectPath, win);
    }
    catch (error) {
        throw new Error(error);
    }

    win.webContents.send("workChanged", "正在完成");
    win.webContents.send("onCompleted");
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
                if (pathValue.includes(path))
                    resolve();

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

async function extractCompiler(path, win) {
    let promise = new Promise((resolve, reject) => {
        try {
            let unzipper = new DecomressZip(mingwPackage);
            unzipper.on("progress", (fileIndex, fileCount) => {
                let percent = (fileIndex + 1) / fileCount * 100;
                win.webContents.send("workChanged", "正在写出MinGW(" + Math.round(percent) + "%)");
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

async function extractConfig(path, win) {
    let promise = new Promise((resolve, reject) => {
        let unzipper = new DecomressZip(configPackage);
        unzipper.on("progress", (fileIndex, fileCount) => {
            let percent = (fileIndex + 1) / fileCount * 100;
            win.webContents.send("workChanged", "正在配置工作区(" + Math.round(percent) + "%)");
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
    let promise = new Promise((resolve, reject) => {
        cmd.get("code --version", (err, data, stdrr) => {
            if (err) {
                resolve(false);
            }
            resolve(true);
        });
    });
    return promise;
}

let e = {
    startInstall: startInstall
}

module.exports = e;