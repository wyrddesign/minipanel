const START_MSG_MARKER =            0xff;
const MSG_TYPE_PROBE =              0x00;
const MSG_TYPE_KEY_PRESS =          0x01;
const MSG_TYPE_KEY_ON =             0x02;
const MSG_TYPE_KEY_OFF =            0x03;
const MSG_TYPE_MODE =               0x04;

const MSG_MODE_SINGLE_KEY =         0x00;
const MSG_MODE_MULTI_KEY =          0x01;

function parseMessage(type, data) {
    switch(type) {
        case MSG_TYPE_PROBE:
            return new ProbeMessage();
        case MSG_TYPE_KEY_PRESS:
            return new KeyPressMessage(data);
        case MSG_TYPE_KEY_ON:
            return new KeyOnMessage(data);
        case MSG_TYPE_KEY_OFF:
            return new KeyOffMessage(data);
        case MSG_TYPE_MODE:
            return new ModeMessage(data);
        default:
            return new Message(type, data);
    }
}

function dump(type, data) {
    return new Uint8Array([START_MSG_MARKER, type, data]);
}

function dumpMessage(message) {
    switch(true) {
        case message instanceof ProbeMessage:
            return dump(MSG_TYPE_PROBE, 0x0);
        case message instanceof KeyPressMessage:
            return dump(MSG_TYPE_KEY_PRESS, message.idx);
        case message instanceof KeyOnMessage:
            return dump(MSG_TYPE_KEY_ON, message.idx);
        case message instanceof KeyOffMessage:
            return dump(MSG_TYPE_KEY_OFF, message.idx);
        case message instanceof ModeMessage:
            return dump(MSG_TYPE_MODE, message.mode);
        case message instanceof Message:
            return dump(message.type, message.data);
        default:
           throw Error();
    }
}

function ProbeMessage() {
}

function KeyPressMessage(idx) {
    this.idx = idx;
}

function KeyPressMessage(idx) {
    this.idx = idx;
}

function KeyOnMessage(idx) {
    this.idx = data;
}

function KeyOffMessage(idx) {
    this.idx = idx;
}

function ModeMessage(mode) {
    this.mode = mode;
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
            message = parseMessage(type, data);
        }
    }
}