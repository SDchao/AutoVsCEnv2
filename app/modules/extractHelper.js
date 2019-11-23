const sevenBin = require('7zip-bin');
const es7z = require('es-7z');

function extract(packagePath, targetPath) {
    return new Promise((resolve, reject) => {
        try {
            let exePath = sevenBin.path7za;
            let promise = es7z.extractFull7z(packagePath, targetPath, {
                exePath
            })
            promise.then(() => {
                resolve()
            })

        }
        catch (err) {
            reject(err);
        }
    });
}

let e = {
    extract: extract
}

module.exports = e;