/* eslint-disable no-unused-vars */
const electron = require("electron");
const remote = electron.remote;

function quit() {
    require("electron").remote.app.quit(0);
}

function openSDchaoLink() {
    remote.shell.openExternal("https://space.bilibili.com/12263994");
}