const electron = require('electron');
const ipc = electron.ipcRenderer;

/**
 * @type HTMLParagraphElement
 */
let infoP = document.querySelector("#info");

ipc.on("workChanged",(event,message) => {
    infoP.innerHTML = message;
});

ipc.on("onCompleted", () => {
    location.replace("./completed.html");
});