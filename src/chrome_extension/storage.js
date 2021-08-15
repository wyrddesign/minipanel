chrome.storage.local.getAsync = async function(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], (result) => {
            if (result) {
                resolve(result[key]);
            } else {
                reject();
            }
        });
    });
}

chrome.storage.local.setAsync = async function(obj) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(obj, () => { 
            resolve(obj);
        });
    });
}