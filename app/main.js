const electron = require('electron');

function createWindow() {
    let win = new electron.BrowserWindow({
        width: 700,
        height: 300,
        resizable: false,
        useContentSize: true,
        webPreferences: {
            nodeIntegration: true
        }
    });
    win.loadFile("./pages/welcome.html");
    electron.Menu.setApplicationMenu(null);
    console.log("Window Created!");
}
electron.app.on('ready', createWindow);

// 开始安装
electron.ipcMain.on("startInstall", () => {
    let win = electron.BrowserWindow.getFocusedWindow();
});