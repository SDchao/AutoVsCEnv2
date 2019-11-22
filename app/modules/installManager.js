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

    compilerPath = path.normalize(path.join(compilerPath, "mingw"));
    win.webContents.send("workChanged", "正在配置环境变量");
    try {
        await addInPath(path.join(compilerPath, "bin"));
    }
    catch (error) {
        showError("配置环境变量", error);
    }

    win.webContents.send("workChanged", "正在写出MinGW");
    try {
        await extractCompiler(compilerPath, win);
    }
    catch (error) {
        showError("解压MinGW", error);
    }

    win.webContents.send("workChanged", "正在配置工作区");
    projectPath = path.normalize(projectPath);
    try {
        await extractConfig(projectPath, win);
    }
    catch (error) {
        showError("解压配置区文件", error);
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

function showError(workOn, err) {
    let win = electron.BrowserWindow.getFocusedWindow();
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