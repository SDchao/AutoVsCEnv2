const regedit = require('regedit');
regedit.setExternalVBSLocation("resources/regedit/vbs");

async function addInPath(path) {
    let promise = new Promise((resolve, reject) => {
        let envPath = "HKCU\\Environment";
        try {
            regedit.list(envPath, (err, result) => {
                if (err) {
                    throw err;
                }

                let pathValue = result[envPath].values.Path.value;

                // 如果path中已经包含目标路径则返回
                if (pathValue.includes(path)) {
                    resolve();
                    return;
                }


                //path不以分号结尾则添加
                if (!pathValue.endsWith(";"))
                    pathValue += ";";

                pathValue += path;

                let valueToInput = {
                    "HKCU\\Environment": {
                        'Path': {
                            value: pathValue,
                            type: 'REG_EXPAND_SZ'
                        }
                    }
                };
                regedit.putValue(valueToInput, (err) => {
                    reject(err);
                });
                resolve();
            });
        }
        catch (err) {
            reject(err);
        }
    });
    return promise;
}

async function getVscodePath() {
    let uninstallPaths = ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\",
        "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\",
        "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\"];

    let codeGuid = '{771FD6B0-FA20-440A-A002-3B3BAC16DC50}';

    return new Promise((resolve, reject) => {
        regedit.list(uninstallPaths, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            let vscodeRegPath;
            for (let i in uninstallPaths) {
                /**
                 * @type String[]
                 */
                let keys = result[uninstallPaths[i]].keys;
                for(let j in keys) {
                    if(keys[j].search(codeGuid) != -1) {
                        vscodeRegPath = uninstallPaths[i] + keys[j];
                        break;
                    }
                } 
                
                if(vscodeRegPath) {
                    break; 
                }   
            }

            if(!vscodeRegPath) {
                resolve(undefined);
                return;
            }


            regedit.list(vscodeRegPath, (err,result) => {
                if(err) {
                    reject(err);
                    return;
                }

                let path = result[vscodeRegPath].values.InstallLocation.value;
                resolve(path);
            })
        });
    });
}

let e = {
    addInPath: addInPath,
    getVscodePath: getVscodePath
}

module.exports = e;