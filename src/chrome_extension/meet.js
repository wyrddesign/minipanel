function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Wait for a promise from any of the given generators to resolve, then re-emit its result with the generator's key.
async function *select(generators) {
    // The mapped generators should yield the user-supplied key, their index and the promise result.
    const mapped = [];
    let mapGenerator = (idx, key) => {
        return async function*() {
            for await (const result of generators[key]) {
                yield {idx: idx, key: key, result: result};
            }
        }
    };
    let idx = 0;
    for (const key in generators) {
        mapped.push(mapGenerator(idx, key)());
        idx += 1;
    }

    const promises = mapped.map(generator => generator.next());
    let lastResolvedIdx = undefined;
    while(true) {
        if (lastResolvedIdx !== undefined) {
            promises[lastResolvedIdx] = mapped[lastResolvedIdx].next();
        }
        const {value, done} = await Promise.race(promises);
        const {idx, key, result} = value;
        lastResolvedIdx = idx;
        if (done) {
            return {key: key, result: result};
        } else {
            yield {key: key, result: result};
        }
    }
}

function *liveElementObserver(isNode) {
    while(true) {
        yield new Promise((resolve, reject) => {
            var observer = new MutationObserver((mutations, mutationObserver) => {
                let added, removed;
                for (const mutation of mutations) {
                    addedLoop: for (const addedNode of mutation.addedNodes) {
                        if (isNode(addedNode)) {
                            added = addedNode;
                            break addedLoop;
                        }
                    }
                    removedLoop: for (const removedNode of mutation.removedNodes) {
                        if (isNode(removedNode)) {
                            removed = removedNode;
                            break removedLoop;
                        }
                    }
                }
                if (added || removed) {
                    mutationObserver.disconnect();
                    resolve({added: added, removed: removed});
                }
            });
            observer.observe(document, {childList: true, subtree: true});
        });
    }
}

class Muteable {
    constructor(labelMute, labelUnmute) {
        this.labelMute = labelMute;
        this.labelUnmute = labelUnmute;
        this.button = undefined;
        this.isToggling = false;
        this.clickResolve = undefined;
        this.listenForButtons();
    }

    async onClickListener() {
        if (!this.isToggling && this.clickResolve) {
            this.clickResolve(await this.isMuted());
            this.clickResolve = undefined;
        }
    }

    async *clicks() {
        while(true) {
            yield new Promise((resolve, reject) => {
                this.clickResolve = resolve
            });
        }
    }

    async listenForButtons() {
        const buttonObserver = liveElementObserver((node) => {
            // Meet uses the same node for muting and unmuting
            const label = node.getAttribute && node.getAttribute("aria-label");
            return label && (label.includes(this.labelMute) || label.includes(this.labelUnmute));
        });
        let buttonResolve, buttonReject, lastButton;
        this.button = new Promise((resolve, reject) => {
            buttonResolve = resolve;
            buttonReject = reject;
        });
        for await (const {added} of buttonObserver) {
            if (lastButton) {
                lastButton.removeEventListener("click", () => this.onClickListener());
                buttonReject();
                this.button = new Promise((resolve, reject) => {
                    buttonResolve = resolve;
                    buttonReject = reject;
                });
            }
            if (added) {
                lastButton = added;
                added.addEventListener("click", () => this.onClickListener());
                buttonResolve(added);
            }
        }
    }

    async isMuted() {
        const button = await this.button;
        return button.getAttribute("aria-label").includes(this.labelUnmute);
    }

    // Mute this device if it is unmuted or unmute it if it was muted.
    async toggle() {
        const button = await this.button;
        if (!this.isToggling) {
            this.isToggling = true;
            button.click();
            await sleep(200);
            this.isToggling = false;
            return {isToggling: false, isMuted: await this.isMuted()};
        } else {
            return {isToggling: true};
        }
    }
}

class MeetExtension {
    constructor() {
        const devices = [];
        // Order these left to right, the same as in the Meet UI
        devices.push(new Muteable("Turn off microphone", "Turn on microphone"));
        devices.push(new Muteable("Turn off camera", "Turn on camera"));
        this.devices = devices;
    }

    async *clicks() {
        for await (const {key, result} of select(this.devices.map(d => d.clicks()))) {
            yield {idx: key, isMuted: result};
        }
    }

    async listen(viewModel) {
        const enableOnMeet = await viewModel.enableOnMeet.get();
        if (enableOnMeet) {
            // The user must be prompted in order to get a list of devices
            for await (const miniPanel of MiniPanel.getForever({shouldPromptUser: true, shouldUseCached: true})) {
                // this.miniPanel = miniPanel;
                miniPanel.setKeyModeMultiKey();
                // Wait for the UI or the button panel to be pressed
                for await (const {key, result} of select({messages: miniPanel.receive(), clicks: this.clicks(miniPanel)})) {
                    switch(key) {
                        case "messages":
                            const message = result;
                            if (message instanceof KeyPressMessage) {
                                const device = this.devices[message.idx];
                                if (device) {
                                    const {isMuted, isToggling} = await device.toggle();
                                    if (!isToggling) {
                                        await miniPanel.sendKeyToggle(message.idx, isMuted);
                                    }
                                }
                            }
                            break;
                        case "clicks":
                            const {idx, isMuted} = result;
                            miniPanel.sendKeyToggle(idx, isMuted);
                            break;
                    }
                }
            }
        }
    }
}

MiniPanel.prototype.sendKeyToggle = function(idx, isEnabled) {
    this.send(new Message(isEnabled ? MSG_TYPE_KEY_ON : MSG_TYPE_KEY_OFF, parseInt(idx)));
}

MiniPanelSerial.logger = {
    onSend: (message) => console.log(message.constructor.name, message),
    onReceive: (message) => console.log(message.constructor.name, message)
};

new MeetExtension().listen(viewModel);