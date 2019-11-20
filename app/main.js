const electron = require('electron');

function createWindow() {
    let win = new electron.BrowserWindow({
        width: 500,
        height: 250,
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
    //选择MinGW解压路径
    let mingwPath = undefined;
    while (!mingwPath) {
        mingwPath = electron.dialog.showOpenDialogSync(win, {
            title: "选择编译器安装路径",
            buttonLabel: "就这里啦",
            properties: ["openDirectory"]
        });
    }


    //载入安装页面
    win.loadFile("./pages/processing.html");
});