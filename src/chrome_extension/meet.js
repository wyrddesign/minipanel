function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function* nodeAvailable(filterCallback) {
    let lastAddedNode = undefined;
    while(true) {
        if (lastAddedNode && lastAddedNode.parentNode) {
            yield Promise.resolve(lastAddedNode);
        } else {
            yield new Promise((resolve, reject) => {
                var observer = new MutationObserver((mutations, mutationObserver) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (filterCallback(node)) {
                                mutationObserver.disconnect();
                                lastAddedNode = node;
                                resolve(node);
                            }
                        });
                        // mutation.removedNodes.forEach((node) => {
                        //     if (filterCallback(node)) {
                        //         mutationObserver.disconnect();
                        //         lastAddedNode = undefined;
                        //     }
                        // });
                    });
                });
                observer.observe(document, {childList: true, subtree: true});
            });
        }
    }
}

class NoButtonFoundException extends Error {}

class Muteable {
    constructor(labelMute, labelUnmute) {
        this.labelMute = labelMute;
        this.labelUnmute = labelUnmute;
        // Meet uses the same node for muting and unmuting
        this.nodeAvailableIter = nodeAvailable((node) => { 
            const label = node.getAttribute && node.getAttribute("aria-label");
            return label && (label.includes(this.labelMute) || label.includes(this.labelUnmute));
        });
        // Start searching for the node
        this.nodeAvailableIter.next();
        this.isAwaitingAnimation = false;
    }

    async getButton() {
        const {value} = await this.nodeAvailableIter.next();
        return value;
    }

    async isMuted() {
        const button = await this.getButton();
        return button.getAttribute("aria-label").includes(this.labelUnmute);
    }

    isToggling() {
        return this.isAwaitingAnimation;
    }

    /**
     * Mute this device if it is unmuted or unmute it if it was muted.
     * 
     * @returns whether this device is currently muted after the toggle
     */
    async toggle() {
        const button = await this.getButton();
        button.click();
        this.isAwaitingAnimation = true;
        await sleep(200);
        this.isAwaitingAnimation = false;
        return this.isMuted();
    }
}

async function listenForever() {
    const camera = new Muteable("Turn off camera", "Turn on camera");
    const microphone = new Muteable("Turn off microphone", "Turn on microphone");

    // Order these left to right, the same as in the Meet UI
    const deviceMap = [microphone, camera];

    let miniPanel = await MiniPanel.create();
    console.log("Created MiniPanel");

    if (miniPanel) {
        miniPanel.setKeyModeMultiKey();

        // Set the initial states
        for (const [idx, device] in deviceMap.entries()) {
            const isMuted = await device.toggle();
            miniPanel.send(new Message(isMuted ? MSG_TYPE_KEY_ON : MSG_TYPE_KEY_OFF, idx));
        }

        await miniPanel.listenForever(async (message) => {
            if (message instanceof KeyPressMessage) {
                const idx = message.idx;
                const device = deviceMap[idx];
                if (device && !device.isToggling()) {
                    const isMuted = await device.toggle();
                    return new Message(isMuted ? MSG_TYPE_KEY_ON : MSG_TYPE_KEY_OFF, idx);
                }
            }
        });
    }
}

listenForever();