const electron = require('electron');
const os = require("os");
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

app.on('ready', createWindow);

// 收到开始安装消息
ipc.on('startInstall', (event, args)=> {
    win.loadFile("./pages/installing.html");
    win.webContents.once("did-finish-load", ()=> {
        installing = true;
        im.startInstall(args[0],args[1]);
    });
});
