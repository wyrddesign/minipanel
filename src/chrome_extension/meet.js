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
        // Create a callback for when the button itself is clicked
        this.onButtonToggleCallback = undefined;
    }

    onButtonToggle(callback) {
        this.onButtonToggleCallback = callback;
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