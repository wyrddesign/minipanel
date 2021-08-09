const START_MSG_MARKER = 0xff;
const MSG_TYPE_PROBE = 0x00;
const MSG_TYPE_KEY_ON = 0x01;
const MSG_TYPE_KEY_OFF = 0x02;
const MSG_TYPE_MODE_SINGLE_KEY = 0x03;
const MSG_TYPE_MODE_MULTI_KEY = 0x04;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ProbeMessage() {
    this.type = MSG_TYPE_PROBE;
    this.data = 0x0;
}

function KeyOnMessage(idx) {
    this.type = MSG_TYPE_KEY_ON;
    this.data = idx;
}

function Message(type, data) {
    this.type = type;
    this.data = data;
}

function* parseMessages() {
    let state = "idle";
    let type = undefined;
    let data = undefined;
    let message = undefined;

    while(true) {
        const byte = yield message;
        if (message) {
            message = undefined;
        }
        if (byte === undefined) {
            break;
        }
        if (state == "idle") {
            if (byte === START_MSG_MARKER) {
                state = "awaitType";
            }
        } else if (state === "awaitType") {
            type = byte;
            state = "awaitData";
        } else if (state === "awaitData") {
            data = byte;
            state = "idle";
            message = new Message(type, data);
        }
    }
}

SerialPort.prototype.sendMessage = async function(message) {
    const writer = this.writable.getWriter();
    await writer.write(new Uint8Array([START_MSG_MARKER, message.type, message.data]));
    writer.releaseLock();
}

SerialPort.prototype.receiveMessages = async function*() {
    const bytes = [];
    const messageParser = parseMessages();
    messageParser.next();
    let reader;

    try {
        while(this.readable) {
            reader = this.readable.getReader();   
            const { value, done } = await reader.read();
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

SerialPort.prototype.probe = async function() {
    await this.open({ baudRate: 9600 });

    // Wait for the Arduino to reset
    await sleep(3000);
    await this.sendMessage(new ProbeMessage());
    const {value} = await this.receiveMessages().next();
 
    // Return true if a MiniPanel was found
    if (value && value.type === MSG_TYPE_PROBE) {
        return true;
    } else {
        this.close();
        return false;
    }
}