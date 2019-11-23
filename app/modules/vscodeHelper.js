const cmd = require("node-cmd");
const path = require('path');
const regeditHelper = require('./regeditHelper');
const util = require("util");
const fs = require("fs");
/**
* @type String
*/
let vscodePath;
let hasVscode = 0;

async function checkVsCode() {
    vscodePath = await regeditHelper.getVscodePath();
    let command = "";

    if (vscodePath) {
        command += vscodePath.substring(0, 2);
        command += "&&";
        command += 'cd "' + vscodePath + 'bin"';
        command += "&&"
    }
    command += "code --version";
    // eslint-disable-next-line no-unused-vars
    let promise = new Promise((resolve, reject) => {
        // eslint-disable-next-line no-unused-vars
        cmd.get(command, (err) => {
            if (err) {
                hasVscode = -1;
                resolve(false);
                return;
            }
            resolve(true);
            hasVscode = 1;
        });
    });
    return promise;
}

async function replacePathInConfig(projectPath, compilerPath) {
    return new Promise((resolve, reject) => {
        try {
            compilerPath = compilerPath.replace(/\\/g, "/");
            let configPath = path.join(projectPath, ".vscode");
            let paths = [path.join(configPath, "c_cpp_properties.json"), path.join(configPath, "launch.json")];
            for (let i = 0; i < paths.length; i++) {
                let content = fs.readFileSync(paths[i]).toString();
                content = content.replace(/%%cPath%%/g, compilerPath);
                fs.writeFileSync(paths[i], content);
            }
            resolve();
        }
        catch (error) {
            reject(error);
        }
    });
}

async function installExtension() {
    return new Promise((resolve, reject) => {
        if (hasVscode == -1)
            return;
        if (hasVscode == 0) {
            checkVsCode()
            .catch((err) => {
                reject(err);
            })
            .then((res) => {
                if(!res) {
                    reject(new Error("No code found"));
                }                  
            });
        }

        let command = "";
        if (vscodePath) {
            command += vscodePath.substring(0, 2);
            command += "&&";
            command += 'cd "' + vscodePath + 'bin"';
            command += "&&"
        }
        command += "code --install-extension ms-vscode.cpptools";
        
        const getAsync = util.promisify(cmd.get, { multiArgs: true, context: cmd });
        getAsync(command)
        .then(data => {
            if(data.search("ms-vscode.cpptools") != -1) {
                resolve(true);
            }
            else{
                resolve(false);
            }
        })
        .catch(err => {
            reject(new Error(err));
        });

    });
}

function openCode(path) {
    let command = "";
        if (vscodePath) {
            command += vscodePath.substring(0, 2);
            command += "&&";
            command += 'cd "' + vscodePath + 'bin"';
            command += "&&"
        }
        command += "code -g " + path;
        cmd.run(command);
}

let e = {
    checkVsCode: checkVsCode,
    replacePathInConfig: replacePathInConfig,
    installExtension: installExtension,
    openCode: openCode
}

module.exports = e;