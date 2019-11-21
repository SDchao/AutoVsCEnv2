const electron = require('electron');
const os = require("os");
const app = electron.app;
const dialog = electron.dialog;
const BrowserWindow = electron.BrowserWindow;

if (!os.platform().includes("win")) {
    dialog.showErrorBox("啊偶", "这个工具只能在Windows平台上奏效……\n即将退出");
    app.exit(0);
}

function createWindow() {
    let win = new BrowserWindow({
        width: 700,
        height: 300,
        backgroundColor: "#40514e",
        resizable: false,
        useContentSize: true,
        webPreferences: {
            nodeIntegration: true
        }
    });
    win.loadFile("./pages/welcome.html");

    // win.webContents.openDevTools();
    electron.Menu.setApplicationMenu(null);
    console.log("Window Created!");
}

app.on('ready', createWindow);