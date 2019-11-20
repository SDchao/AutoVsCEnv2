/* eslint-disable no-unused-vars */

const electron = require("electron");

function startInstall() {
    electron.ipcRenderer.send("startInstall")
}