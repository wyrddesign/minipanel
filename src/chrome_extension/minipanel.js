class MiniPanel {    
    static deviceFilters = [
        {usbProductId: 29987, usbVendorId: 6790}
    ];

    static async fromSerialPort(serialPort) {
        if (serialPort && await serialPort.probe()) {
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
        this.serialPort = serialPort;
    }

    async setModeMultiKey() {
        await this.serialPort.sendMessage(new Message(MSG_TYPE_MODE_MULTI_KEY, 0x0));
    }

    async send(message) {
        await this.serialPort.sendMessage(message);
    }

    async listenForever(callback) {
        for await (const message of this.serialPort.receiveMessages()) {
            if (message) {
                // Let the callback run asynchronously so that new messages aren't blocked.
                callback(message).then((message) => {
                    if (message) {
                        this.serialPort.sendMessage(message);
                    }
                });
            }
        }
    }

    

    async close() {
        await this.serialPort.close();
    }
}
