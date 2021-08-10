function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class MiniPanelSerial {
    constructor(serialPort) {
        this.serialPort = serialPort;
    }
    
    async open() {
        await this.serialPort.open({baudRate: 9600});
    }

    async send(message) {
        const writer = this.serialPort.writable.getWriter();
        await writer.write(dumpMessage(message));
        writer.releaseLock();
    }

    async *receive() {
        const bytes = [];
        const messageParser = parseMessages();
        messageParser.next();
        let reader;
    
        try {
            while(this.serialPort.readable) {
                reader = this.serialPort.readable.getReader();   
                const { value, done } = await reader.read();
    
                // Release the lock before yielding a value in case the iterator is never used again
                reader.releaseLock();
                bytes.push(...value);
                while(bytes.length) {
                    const byte = bytes.shift();
                    const {value} = messageParser.next(byte);
                    if (value) {
                        yield value;
                    }
                }
                if (done) {
                    break;
                }
            }
        } finally {
            if (reader) {
                reader.releaseLock();
            }
        }
    }

    async close() {
        await this.serialPort.close();
    }

    getInfo() {
        return this.serialPort.getInfo();
    }
}

class MiniPanel {    
    static deviceFilters = [
        {usbProductId: 29987, usbVendorId: 6790}
    ];

    static async probe(serialPort) {
        const serial = new MiniPanelSerial(serialPort);
        await serial.open();
        
        // Wait for the Arduino to reset
        await sleep(3000);
        await serial.send(new ProbeMessage());
        const {value} = await serial.receive().next();
    
        // Return true if a MiniPanel was found
        if (value instanceof ProbeMessage) {
            return true;
        } else {
            serial.close();
            return false;
        }
    }

    static async fromSerialPort(serialPort) {
        if (serialPort && await this.probe(serialPort)) {
            return new MiniPanel(serialPort);
        }
    }

    static async fromStorage() {
        return await miniPanelStorage.get();
    }

    static async fromUser() {
        return await this.fromSerialPort(await navigator.serial.requestPort({filters: this.deviceFilters}));
    }

    static async create() {
        let miniPanel = await this.fromStorage();
        if (!miniPanel) {
            miniPanel = await this.fromUser();
            await miniPanelStorage.set(miniPanel);
        }
        if (!miniPanel) {
            throw new Error("MiniPanel not available.");
        }
        return miniPanel;
    }

    constructor(serialPort) {
        this.serial = new MiniPanelSerial(serialPort);
    }

    async setModeMultiKey() {
        await this.serial.send(new ModeMessage(MSG_MODE_MULTI_KEY));
    }

    async setModeSingleKey() {
        await this.serial.send(new ModeMessage(MSG_MODE_SINGLE_KEY));
    }

    async send(message) {
        await this.serial.send(message);
    }

    async listenForever(callback) {
        for await (const message of this.serial.receive()) {
            if (message) {
                // Let the callback run asynchronously so that new messages aren't blocked.
                callback(message).then((message) => {
                    if (message) {
                        this.serial.send(message);
                    }
                });
            }
        }
    }

    async close() {
        await this.serial.close();
    }
}
