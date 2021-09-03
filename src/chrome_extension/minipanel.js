function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class MiniPanelSerial {

    static logger = {
        onSend: () => {},
        onReceive: () => {},
    };

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
        MiniPanelSerial.logger.onSend(message);
        this.writer = undefined;
    }

    async *receive() {
        const bytes = [];
        const messageParser = parseMessages();
        messageParser.next();
    
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
                        MiniPanelSerial.logger.onReceive(value);
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
        await serial.send(new ProbeMessage(MSG_PROBE_QUERY_VERSION));
        const {value} = await serial.receive().next();
    
        // Return the MiniPanel probe message if found
        if (value instanceof ProbeMessage) {
            return value;
        } else {
            serial.close();
            return false;
        }
    }

    static async fromSerialPort(serialPort) {
        if (serialPort) {
            const probeMessage = await this.probe(serialPort);
            if (probeMessage) {
                const {version, numButtons} = probeMessage;
                return new MiniPanel(version, numButtons, serialPort);
            }
        }
    }

    static async fromStorage() {
        return await viewModel.getMiniPanelFromId();
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
            await viewModel.setId(miniPanel);
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

    constructor(version, numButtons, serialPort) {
        this.version = version;
        this.numButtons = numButtons;
        this.serial = new MiniPanelSerial(serialPort);
    }

    async setKeyModeMultiKey() {
        await this.send(new KeyModeMessage(MSG_KEY_MODE_MULTI_KEY));
    }

    async setKeyModeSingleKey() {
        await this.send(new KeyModeMessage(MSG_KEY_MODE_SINGLE_KEY));
    }

    async send(message) {
        await this.serial.send(message);
    }

    async *receive() {
        try {
            for await (const message of this.serial.receive()) {
                if (message) {
                    yield message;
                }
            }
        } catch(e) {
            if (e instanceof DOMException) {
                // The panel has disconnected
                return;
            } else {
                throw e;
            }
        }
    }

    async close() {
        await this.serial.close();
    }
}