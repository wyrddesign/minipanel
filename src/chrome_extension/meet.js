function $x(path) {
    const results = [];
    const iterator = document.evaluate(path, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    let node = iterator.iterateNext();
    while(node) {
        results.push(node);
        node = iterator.iterateNext();
    }
    return results;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class NoButtonFoundException extends Error {}

class Muteable {
    constructor(labelMute, labelUnmute) {
        this.labelMute = labelMute;
        this.labelUnmute = labelUnmute;
        this.button = undefined;
        this.isAwaitingAnimation = false;
    }

    async findButton() {
        const onButtonFound = (button) => {
            this.button = button;
        }
        const labelMute = this.labelMute;
        const labelUmute = this.labelUnmute;
        return new Promise((resolve, reject) => {
            var observer = new MutationObserver((mutations, me) => {
                const button = $x("//*[contains(@aria-label, '" + labelMute + "')]")[0] || $x("//*[contains(@aria-label, '" + labelUmute + "')]")[0];
                if (button) {
                    onButtonFound(button);
                    me.disconnect();
                    resolve();
                }
            });
            observer.observe(document, {childList: true, subtree: true});
        });
    }

    isMuted() {
        return this.button.getAttribute("aria-label").includes(this.labelUnmute);
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
        this.button.click();
        this.isAwaitingAnimation = true;
        await sleep(200);
        this.isAwaitingAnimation = false;
        return this.isMuted();
    }
}

async function listenForever() {
    const camera = new Muteable("Turn off camera", "Turn on camera");
    const microphone = new Muteable("Turn off microphone", "Turn on microphone");

    await camera.findButton();
    await microphone.findButton();

    // Order these left to right, the same as in the Meet UI
    const deviceMap = [microphone, camera];

    let miniPanel = await MiniPanel.create();
    console.log("Created MiniPanel", miniPanel);
    if (miniPanel) {
        miniPanel.setModeMultiKey();

        // Set the initial states
        for (const [idx, device] in deviceMap.entries()) {
            const isMuted = await device.toggle();
            miniPanel.send(new Message(isMuted ? MSG_TYPE_KEY_ON : MSG_TYPE_KEY_OFF, idx));
        }

        await miniPanel.listenForever(async (message) => {
            if (message.type == MSG_TYPE_KEY_ON) {
                const idx = message.data;
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