const connectNode = document.getElementById("connect");
const disconnectNode = document.getElementById("disconnect");
const chooseNode = document.getElementById("choose");
const clearLogNode = document.getElementById("clearLog");
const logNode = document.getElementById("log");
const idNode = document.getElementById("id");
const enableOnMeetNode = document.getElementById("enableOnMeet");

MiniPanelSerial.logger = {
    onSend: (message) => logSend(message.constructor.name + " " + JSON.stringify(message, undefined, 1)),
    onReceive: (message) => logReceive(message.constructor.name + " " + JSON.stringify(message, undefined, 1))
};

viewModel.state.listen((value) => {
    switch(value.type) {
        case ViewModel.STATE_CONNECTING:
            log("Probing for MiniPanel.");
            connectNode.setEnabled(false);
            disconnectNode.setEnabled(false);
            chooseNode.setEnabled(false);
            clearLogNode.setEnabled(false);
            break;
        case ViewModel.STATE_CONNECTED:
            const miniPanel = value.miniPanel;
            log("MiniPanel v" + miniPanel.version + " with " + miniPanel.numButtons + " buttons found.");
            connectNode.setEnabled(false);
            disconnectNode.setEnabled(true);
            chooseNode.setEnabled(false);
            clearLogNode.setEnabled(true);
            break;
        case ViewModel.STATE_DISCONNECTED:
            log("MiniPanel disconnected.");
            connectNode.setEnabled(true);
            disconnectNode.setEnabled(false);
            chooseNode.setEnabled(true);
            clearLogNode.setEnabled(false);
            break;
    }
})

viewModel.id.listen((value) => {
    idNode.value = value;
    connectNode.setEnabled(id ? true : false);
});

viewModel.enableOnMeet.listen((value) => {
    enableOnMeetNode.checked = value;
})

enableOnMeetNode.addEventListener("click", (e) => {
    viewModel.setEnableOnMeet(e.target.checked);
});

Node.prototype.setEnabled = function(shouldEnable) {
    if (shouldEnable) {
        this.removeAttribute("disabled");
    } else {
        this.setAttribute("disabled", "");       
    }
}

function log(text) {
    const node = document.createElement("li");
    node.setAttribute("class", "logMessage");
    node.textContent = text;
    logNode.appendChild(node);
    node.scrollIntoView();
    return node;
}

function logSend(text) {
    const node = log(text);
    node.setAttribute("class", "sendMessage");
}

function logReceive(text) {
    const node = log(text);
    node.setAttribute("class", "receiveMessage");
}

chooseNode.addEventListener("click", async () => {
    viewModel.setConnecting();
    try {
        const miniPanel = viewModel.setConnected(await MiniPanel.get({shouldPromptUser: true, shouldUseCached: false}));
        if (miniPanel) {
            await viewModel.setId(miniPanel);
            log("This MiniPanel will now be used during Meet calls.");
            await miniPanel.close();
        } else {
            log("MiniPanel not found.");
        }
    } finally {
        viewModel.setDisconnected();
    }
});

connectNode.addEventListener("click", async () => {
    viewModel.setConnecting();
    for await (const miniPanel of MiniPanel.getForever({shouldPromptUser: true, shouldUseCached: true})) {
        viewModel.setConnected(miniPanel);
        await miniPanel.setKeyModeSingleKey();
        for await (const message of miniPanel.receive()) {
            if (message instanceof KeyPressMessage) {
                miniPanel.send(new KeyOnMessage(message.idx));            
            }
        }
        viewModel.setDisconnected();
    }
});

disconnectNode.addEventListener("click", async () => {
    await viewModel.disconnect();
});

clearLogNode.addEventListener("click", async () => {
    while(logNode.firstChild) {
        logNode.removeChild(logNode.firstChild);
    }
});