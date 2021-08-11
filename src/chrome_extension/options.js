const connectNode = document.getElementById("connect");
const disconnectNode = document.getElementById("disconnect");
const chooseNode = document.getElementById("choose");
const clearLogNode = document.getElementById("clearLog");
const logNode = document.getElementById("log");
const idNode = document.getElementById("id");

let currentMiniPanel;

Node.prototype.setEnabled = function(shouldEnable) {
    if (shouldEnable) {
        this.removeAttribute("disabled");
    } else {
        this.setAttribute("disabled", "");       
    }
}

async function populateMiniPanelId() {
    const id = await miniPanelStorage.getId();
    if (id) {
        idNode.value = id;
        connectNode.setEnabled(true);
    } else {
        connectNode.setEnabled(false);
    }
}

function log(text) {
    const node = document.createElement("li");
    node.setAttribute("class", "logMessage");
    node.textContent = text;
    logNode.appendChild(node);
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

function logInfo(miniPanel) {
    log("MiniPanel v" + miniPanel.version + " with " + miniPanel.numButtons + " buttons     found.");
}

async function saveToStorage(miniPanel) {
    await miniPanelStorage.set(miniPanel);
    await populateMiniPanelId();
}

chooseNode.addEventListener("click", async () => {
    chooseNode.setEnabled(false);
    connectNode.setEnabled(false);
    log("Probing for MiniPanel.");
    try {
        miniPanel = await MiniPanel.get({shouldPromptUser: true, shouldUseCached: false});
        if (miniPanel) {
            disconnectNode.setEnabled(true);
            logInfo(miniPanel);
            await saveToStorage(miniPanel);
            log("This MiniPanel will now be used during Meet calls.");
            await miniPanel.close();
            log("MiniPanel disconnected.");
            disconnectNode.setEnabled(false);
        } else {
            log("MiniPanel not found.");
        }
    } finally {
        miniPanel = undefined;
        connectNode.setEnabled(true);
        chooseNode.setEnabled(true);
    }
});

connectNode.addEventListener("click", async () => {
    chooseNode.setEnabled(false);
    connectNode.setEnabled(false);
    log("Probing for MiniPanel.");
    for await (miniPanel of MiniPanel.getForever({shouldPromptUser: true, shouldUseCached: true})) {
        disconnectNode.setEnabled(true);
        logInfo(miniPanel);
        logSend("Setting single key mode.\n");
        await miniPanel.setKeyModeSingleKey();
        await miniPanel.listenForever(async (message) => {
            logReceive(message.constructor.name + ": " + JSON.stringify(message));
            if (message instanceof KeyPressMessage) {
                logSend("KeyOnMessage: " + message.idx);
                return new KeyOnMessage(message.idx);            
            }    
        });
        disconnectNode.setEnabled(false);
        miniPanel = undefined;
        log("MiniPanel disconnected.");
    }
    connectNode.setEnabled(true);
    chooseNode.setEnabled(true);
});

disconnectNode.addEventListener("click", async () => {
    if (miniPanel) {
        await miniPanel.close();
    }
});

clearLogNode.addEventListener("click", async () => {
    while(logNode.firstChild) {
        logNode.removeChild(logNode.firstChild);
    }
});

populateMiniPanelId();
