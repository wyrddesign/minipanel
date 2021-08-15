function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function* findElementByFilter(filter, onAdded, onRemoved) {
    let lastAddedNode = undefined;
    while(true) {
        if (lastAddedNode && lastAddedNode.parentNode) {
            yield Promise.resolve(lastAddedNode);
        } else {
            if (onRemoved && lastAddedNode) {
                onRemoved(lastAddedNode);
            }
            yield new Promise((resolve, reject) => {
                var observer = new MutationObserver((mutations, mutationObserver) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (filter(node)) {
                                mutationObserver.disconnect();
                                lastAddedNode = node;
                                if (onAdded) {
                                    onAdded(lastAddedNode);
                                }
                                resolve(lastAddedNode);
                            }
                        });
                    });
                });
                observer.observe(document, {childList: true, subtree: true});
            });
        }
    }
}

class Muteable {
    constructor(labelMute, labelUnmute) {
        this.labelMute = labelMute;
        this.labelUnmute = labelUnmute;

        this.findElementByFilterIter = findElementByFilter(
            (element) => {
                // Meet uses the same node for muting and unmuting
                const label = element.getAttribute && element.getAttribute("aria-label");
                return label && (label.includes(this.labelMute) || label.includes(this.labelUnmute));
            },
            (element) => element.addEventListener("click", () => this.onClick(element)),
            (element) => element.removeEventListener("click", () => this.onClick(element)));
        // Start searching for the node
        this.findElementByFilterIter.next();

        this.isToggling = false;
        this.onClickListener = undefined;
    }

    // A callback for when the button itself is clicked
    onClick(button) {
        if (this.onClickListener && !this.isToggling) {
            this.onClickListener(this.isMuted(button));
        }
    }

    setOnClickListener(listener) {
        this.onClickListener = listener;
    }

    async getButton() {
        const {value} = await this.findElementByFilterIter.next();
        return value;
    }

    isMuted(button) {
        return button.getAttribute("aria-label").includes(this.labelUnmute);
    }

    // Mute this device if it is unmuted or unmute it if it was muted.
    async toggle() {
        if (!this.isToggling) {
            this.isToggling = true;
            const button = await this.getButton();
            button.click();
            await sleep(200);
            this.isToggling = false;
            return {isToggling: false, isMuted: this.isMuted(button)};
        } else {
            return {isToggling: true};
        }
    }
}

async function listenForever() {
    const camera = new Muteable("Turn off camera", "Turn on camera");
    const microphone = new Muteable("Turn off microphone", "Turn on microphone");

    // Order these left to right, the same as in the Meet UI
    const deviceMap = [microphone, camera];

    for await (const miniPanel of MiniPanel.getForever({shouldPromptUser: true, shouldUseCached: true})) {
        miniPanel.setKeyModeMultiKey();

        // Set the initial states
        for (const [idx, device] in deviceMap.entries()) {
            const isMuted = await device.toggle();
            miniPanel.send(new Message(isMuted ? MSG_TYPE_KEY_ON : MSG_TYPE_KEY_OFF, idx));
        }

        for await (const )

        await miniPanel.onKeyPressForever(async (idx) => {
            const device = deviceMap[idx];
            if (device && !device.isToggling()) {
                const isMuted = await device.toggle();
                return new Message(isMuted ? MSG_TYPE_KEY_ON : MSG_TYPE_KEY_OFF, idx);
            }                
        });
    }
}

listenForever();