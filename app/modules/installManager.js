const electron = require('electron');
const downloadHelper = require("./downloadHelper");
const extractHelper = require("./extractHelper");
const regeditHelper = require("./regeditHelper");
const vscodeHelper = require("./vscodeHelper");

const path = require('path');
const dialog = electron.dialog;

async function startInstall(compilerPath, projectPath, callback) {

    // 文件资源
    let appPath = process.cwd();
    // let mingwUrl = "http://www.lanzous.com/i7iwn2h";
    let mingwUrl = "https://sdchaos.oss-cn-shanghai.aliyuncs.com/MinGW.7z";
    let mingwPackage = appPath + "/resources/MinGW.7z";
    let configPackage = electron.app.getAppPath() + "/resources/config.zip";

    let win = electron.BrowserWindow.getFocusedWindow();
    changeTitle("正在检查环境");

    let hasVsCode = await vscodeHelper.checkVsCode();
    if (!hasVsCode) {
        dialog.showMessageBoxSync(win, {
            type: "warning",
            title: "无法找到VScode",
            buttons: ["稍后手动安装"],
            message: "我们无法在环境变量和注册表中找到VScode\n您可能使用了免安装版的VScode。\n这导致本工具无法为您自动安装VScode插件。\n您可以稍后在VScode中手动安装C/C++插件"
        });
    }


    //安装VScode插件
    if (hasVsCode) {
        changeTitle("正在安装C/C++插件");
        try {
            await vscodeHelper.installExtension();
        }
        catch (err) {
            showError("建议忽略该错误，稍后手动安装\n安装插件", err);
        }
    }

    //编译器
    compilerPath = path.normalize(path.join(compilerPath, "mingw"));

    changeTitle("正在准备MinGW");
    try {
        await downloadHelper.downloadFile(mingwUrl, mingwPackage, (percent, speed) => {
            changeTitle("正在下载MinGW (" + percent + "%) " + speed);
        });
    }
    catch (error) {
        showError("下载MinGW", error);
    }



    changeTitle("正在配置环境变量");
    try {
        await regeditHelper.addInPath(path.join(compilerPath, "bin"));
    }
    catch (error) {
        showError("配置环境变量", error);
    }

    changeTitle("正在解压MinGW");
    try {
        await extractHelper.extract(mingwPackage, compilerPath, (progress) => {
            changeTitle("正在解压MinGW (" + progress + "%)");
        });
    }
    catch (error) {
        showError("解压MinGW", error);
    }

    //工作区解压
    changeTitle("正在配置工作区");
    projectPath = path.normalize(projectPath);
    try {
        await extractHelper.extract(configPackage, projectPath, (progress) => {
            changeTitle("正在配置工作区 (" + progress + "%)")
        });
    }
    catch (error) {
        showError("解压配置区文件", error);
    }

    //工作区文件修改
    changeTitle("正在完成工作区配置");
    try {
        await vscodeHelper.replacePathInConfig(projectPath, compilerPath);
    }
    catch (error) {
        showError("修改配置路径", error);
    }

    changeTitle("正在完成");
    let readmePath = path.join(projectPath,"README_inProject.md");
    vscodeHelper.openCode(readmePath);
    win.webContents.send("onCompleted");
    callback();
}

function changeTitle(text) {
    let win = electron.BrowserWindow.getAllWindows()[0];
    win.webContents.send("workChanged", text);
}

function showError(workOn, err) {
    console.log(err);
    let win = electron.BrowserWindow.getAllWindows()[0];
    let content = workOn + "时发生了意料之外的错误，配置可能将无法生效\n以下为捕捉到的错误信息：\n" + err.stack;
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