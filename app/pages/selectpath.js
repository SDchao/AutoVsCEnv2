/* eslint-disable no-unused-vars */
const electron = require("electron");
const ipcRender = electron.ipcRenderer;
const remote = electron.remote;

let index = 0;
let compilerPath = "";
let projectPath = "";

/**
 * @type HTMLInputElement
 */
let inputPath = document.querySelector("#pathinput");

function selectpathloaded() {
    inputPath.value = remote.app.getPath("appData");
}

function openPathSelect() {
    let path = remote.dialog.showOpenDialogSync(remote.getCurrentWindow(), {
        title: "请选择编译器安装位置",
        defaultPath: inputPath.value,
        properties: [
            "openDirectory"
        ]
    });

    if (path) {
        document.querySelector("#description").innerHTML = "您选择的路径:"
        inputPath.value = path;
    }
}

function prevOnClick() {
    // 若为第一页则返回欢迎界面
    if (index == 0) {
        location.replace("./welcome.html");
    }
    // 若为第二页则重新载入第一页
    else if (index == 1) {
        location.replace("./selectpath.html");
    }
}

function nextOnClick() {
    let path = inputPath.value;
    // 路径是否为空
    if (!path) {
        remote.dialog.showErrorBox("路径不对哦", "路径为空，我也不知道该安装到哪里呀");
        return;
    }

    // 路径是否含中文或特殊符号
    if (/.*[\u4e00-\u9fa5]+.*/.test(path)) {
        remote.dialog.showErrorBox("路径不对哦", "中文会导致调试时出现奇奇怪怪的问题呢，换一个吧");
        return;
    }

    if (index == 0) {
        //保存路径值
        compilerPath = path;
        //更改网页内容
        document.querySelector("#maintitle").innerHTML = "还需要一个路径...";
        document.querySelector("#subtitle").innerHTML = "选择C/C++项目文件夹位置";
        document.querySelector("#info").innerHTML =
            "您今后的源码文件(.c或.cpp)都需要存放在这个文件夹中" +
            "<br>" +
            '对此抱有疑问，<a onclick="whatisprojectfolder()">请点击此处</a>';
        document.querySelector("#prev").innerHTML = "上一步";
        document.querySelector("#next").innerHTML = "开始吧";
        document.querySelector("#description").innerHTML = "当前路径:";

        // 变换页面值
        index = 1;
    }

    // 若为第二页
    if (index == 1) {
        // 保存路径值
        projectPath = path;

        //开始配置
        ipcRender.send("startInstall", [compilerPath, projectPath]);
    }
}