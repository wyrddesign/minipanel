const START_MSG_MARKER =            0xff;
const MSG_TYPE_PROBE =              0x00;
const MSG_TYPE_KEY_PRESS =          0x01;
const MSG_TYPE_KEY_ON =             0x02;
const MSG_TYPE_KEY_OFF =            0x03;
const MSG_TYPE_KEY_MODE =           0x04;

const MSG_PROBE_QUERY_VERSION =     0x00;
const MSG_PROBE_V1 =                0x01;
const MSG_PROBE_V2 =                0x02;

const MSG_KEY_MODE_SINGLE_KEY =     0x00;
const MSG_KEY_MODE_MULTI_KEY =      0x01;

function parseMessage(type, data) {
    switch(type) {
        case MSG_TYPE_PROBE:
            const version = data & 0xf;
            const numButtons = data & 0x10;
            return new ProbeMessage(version, numButtons);
        case MSG_TYPE_KEY_PRESS:
            return new KeyPressMessage(data);
        case MSG_TYPE_KEY_ON:
            return new KeyOnMessage(data);
        case MSG_TYPE_KEY_OFF:
            return new KeyOffMessage(data);
        case MSG_TYPE_KEY_MODE:
            return new KeyModeMessage(data);
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
            return dump(MSG_TYPE_PROBE, message.version);
        case message instanceof KeyPressMessage:
            return dump(MSG_TYPE_KEY_PRESS, message.idx);
        case message instanceof KeyOnMessage:
            return dump(MSG_TYPE_KEY_ON, message.idx);
        case message instanceof KeyOffMessage:
            return dump(MSG_TYPE_KEY_OFF, message.idx);
        case message instanceof KeyModeMessage:
            return dump(MSG_TYPE_KEY_MODE, message.keyMode);
        case message instanceof Message:
            return dump(message.type, message.data);
        default:
           throw Error();
    }
}

function ProbeMessage(version, numButtons) {
    this.version = version;
    this.numButtons = numButtons;
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

function KeyModeMessage(keyMode) {
    this.keyMode = keyMode;
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