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
            resolve();
        });
    });
}

class MiniPanelStorage {
    constructor(key) {
        this.key = key;
    }

    createId(serialPort) {
        const {usbProductId, usbVendorId} = serialPort.getInfo();
        return usbProductId + ":" + usbVendorId;
    }

    async set(miniPanel) {
        if (miniPanel) {
            const id = this.createId(miniPanel.serialPort);
            await chrome.storage.local.setAsync({[this.key]: id});
        }
    }

    async get() {
        const id = await this.getId();
        if (id) {
            const serialPorts = await navigator.serial.getPorts();
            for (const serialPort of serialPorts) {
                console.log(id, this.createId(serialPort));
                if (id === this.createId(serialPort)) {
                    return MiniPanel.fromSerialPort(serialPort);
                }
            }
        }
    }

    async getId() {
        return await chrome.storage.local.getAsync(this.key);
    }
}

const miniPanelStorage = new MiniPanelStorage("miniPanelId");