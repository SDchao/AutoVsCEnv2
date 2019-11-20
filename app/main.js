const electron = require('electron');

var win;

electron.app.on('ready', createWindow);

function createWindow() {
    win = new electron.BrowserWindow({
        width: 500,
        height: 250,
        resizable: false,
        useContentSize: true
    });
    win.loadFile("./pages/welcome.html");
    electron.Menu.setApplicationMenu(null);
}