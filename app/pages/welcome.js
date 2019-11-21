/* eslint-disable no-unused-vars */
const electron = require("electron");
const remote = electron.remote;

function startSelectPath() {
    location.replace("./selectpath.html");
}

function openSDchaoLink() {
    remote.shell.openExternal("https://space.bilibili.com/12263994");
}