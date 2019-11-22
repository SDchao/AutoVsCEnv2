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
        await addInPath(compilerPath);
    }
    catch (error) {
        throw new Error(error);
    }

    win.webContents.send("workChanged", "正在写出MinGW");
    try {
        await extractCompiler(compilerPath, win);
    }
    catch (error) {
        throw new Error(error);
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
        regedit.list(envPath, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            let pathValue = toString(result[envPath].values.Path.value);
            if (!pathValue) {
                reject("Cannot find path value");
                return;
            }

            if (!pathValue.endsWith(";"))
                pathValue += ";";

            pathValue += path + ";";

            let valueToInput = {
                envPath: {
                    values: {
                        'Path' : {
                            value: pathValue
                        }
                    }
                }
            };
            regedit.putValue(valueToInput, (err) => {
                reject(err);
                return;
            })
            resolve();
        })
    });
    return promise;
}

async function extractCompiler(path, win) {
    let promise = new Promise((resolve, reject) => {
        let unzipper = new DecomressZip(mingwPackage);
        unzipper.on("progress", (fileIndex, fileCount) => {
            let percent = (fileIndex + 1) / fileCount * 100;
            win.webContents.send("workChanged", "正在写出MinGW(" + Math.round(percent) + "%)");
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
                reject(err);
                return;
            }
            resolve(!toString(data).includes("code"));
        });
    });
    return promise;
}

let e = {
    startInstall: startInstall
}

module.exports = e;