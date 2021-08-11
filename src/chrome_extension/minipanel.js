function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class MiniPanelSerial {
    constructor(serialPort) {
        this.serialPort = serialPort;
        // Allow the readers and writers to be cancelled
        this.reader = undefined;
        this.writer = undefined;
    }
    
    async open() {
        await this.serialPort.open({baudRate: 9600});
    }

    async send(message) {
        this.writer = this.serialPort.writable.getWriter();
        await this.writer.write(dumpMessage(message));
        this.writer.releaseLock();
        this.writer = undefined;
    }

    async *receive() {
        const bytes = [];
        const messageParser = parseMessages();
        messageParser.next();
        let reader;
    
        try {
            while(this.serialPort.readable) {
                this.reader = this.serialPort.readable.getReader();   
                const { value, done } = await this.reader.read();
    
                // Release the lock before yielding a value in case the iterator is never used again
                this.reader.releaseLock();
                this.reader = undefined;
                if (done || !value) {
                    break;
                }
                bytes.push(...value);
                while(bytes.length) {
                    const byte = bytes.shift();
                    const {value} = messageParser.next(byte);
                    if (value) {
                        yield value;
                    }
                }
            }
        } finally {
            if (this.reader) {
                this.reader.releaseLock();
            }
        }
    }

    async close() {
        if (this.reader) {
            await this.reader.cancel();
        }
        if (this.writer) {
            await this.writer.cancel();
        }
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

    static async get(options) {
        const {shouldPromptUser, shouldUseCached} = options;
        let miniPanel;
        if (shouldUseCached) {
            miniPanel = await this.fromStorage();
        }
        if (!miniPanel && shouldPromptUser) {
            miniPanel = await this.fromUser();
            await miniPanelStorage.set(miniPanel);
        }
        if (!miniPanel) {
            throw new Error("MiniPanel not available.");
        }
        return miniPanel;
    }

    static async *getForever(options) {
        while(true) {
            try {
                yield await this.get(options);
            } catch(e) {
                if (e instanceof DOMException) {
                    // The panel has disconnected
                    return;
                } else {
                    throw e;
                }
            }
        }
    }

    constructor(version, serialPort) {
        this.version = version;
        this.serial = new MiniPanelSerial(serialPort);
    }

    async setKeyModeMultiKey() {
        await this.serial.send(new KeyModeMessage(MSG_KEY_MODE_MULTI_KEY));
    }

    async setKeyModeSingleKey() {
        await this.serial.send(new KeyModeMessage(MSG_KEY_MODE_SINGLE_KEY));
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

    async onKeyPressForever(callback) {
        await this.listenForever(async (message) => {
            if (message instanceof KeyPressMessage) {
                const idx = message.idx;
                const sendMessage = await callback(idx);
                if (sendMessage) {
                    return sendMessage;
                }
            }
        });
    }

    async close() {
        await this.serial.close();
    }
}
