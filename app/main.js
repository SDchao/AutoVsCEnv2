const electron = require('electron');
const os = require("os");
const updateHelper = require('./modules/updateHelper');
const app = electron.app;
const dialog = electron.dialog;
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;
const im = require('./modules/installManager');

if (!os.platform().includes("win")) {
    dialog.showErrorBox("啊偶", "这个工具只能在Windows平台上奏效……\n即将退出");
    app.exit(0);
}

let win;
let installing = false;

function createWindow() {
    win = new BrowserWindow({
        width: 700,
        height: 300,
        backgroundColor: "#40514e",
        resizable: false,
        useContentSize: true,
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });
    win.loadFile("./pages/welcome.html");
    // win.webContents.openDevTools();
    electron.Menu.setApplicationMenu(null);
    // console.log("Window Created!");

    win.webContents.once("did-finish-load", ()=> {
        win.show();
    })

    win.on("close", (event) => {
        if(installing)
            event.preventDefault();
    })
}

function checkUpdate() {
    updateHelper.hasNewVersion()
    .then((hasNew) => {
        if(!hasNew)
            return;
        dialog.showMessageBoxSync(win,{
            title: "发现新版本",
            message: "当前版本极有可能无法使用，强烈建议更新！",
        });
        electron.shell.openExternal("https://github.com/SDchao/AutoVsCEnv2/releases/latest");
    });
}

app.on('ready', createWindow);
app.on('ready', checkUpdate);

// 收到开始安装消息
ipc.on('startInstall', (event, args)=> {
    win.loadFile("./pages/installing.html");
    win.webContents.once("did-finish-load", ()=> {
        installing = true;
        im.startInstall(args[0],args[1], () => {
            installing = false;
        });
    });
});
