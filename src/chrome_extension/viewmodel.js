class Property {
    static NOT_SET = {};

    constructor(initialValue) {
        if (typeof initialValue === "function") {
            this.value = initialValue();
        } else {
            this.value = Promise.resolve(initialValue || Property.NOT_SET);
        }
        this.listeners = [];
    }

    listen(listener) {
        this.listeners.push(listener);
        this.value.then((value) => {
            if (value !== Property.NOT_SET) {
                // Send the listener a value when it's attached, but only if the value is ready
                listener(value);
            }
        });
    }

    removeListener(listener) {
        this.listeners.remove(listener);
    }

    set(value) {
        this.value = Promise.resolve(value);
        this.value.then((value) => {
            this.listeners.forEach((listener) => listener(value));
        });
    }

    async get() {
        return await this.value;
    }
}

class ViewModel {
    static STATE_CONNECTING = 0;
    static STATE_CONNECTED = 1;
    static STATE_DISCONNECTING = 2
    static STATE_DISCONNECTED = 3;

    static ENABLE_ON_MEET_KEY = "enableOnMeet";

    constructor() {
        this.state = new Property(async () => await {type: ViewModel.STATE_DISCONNECTED});
        this.currentMiniPanel = new Property();
        this.id = new Property(async () => await miniPanelStorage.getId());
        this.enableOnMeet = new Property(async () => chrome.storage.local.getAsync(ViewModel.ENABLE_ON_MEET_KEY));
    }

    setConnecting() {
        this.state.set({type: ViewModel.STATE_CONNECTING});
    }

    setConnected(miniPanel) {
        if (miniPanel) {
            this.state.set({type: ViewModel.STATE_CONNECTED, miniPanel: miniPanel});
            this.currentMiniPanel = miniPanel;
            return miniPanel;
        } else {
            this.setDisconnected();
        }
    }

    async disconnect() {
        const state = await this.state.get();
        if (state.type == ViewModel.STATE_CONNECTED) {
            this.state.set({type: ViewModel.STATE_DISCONNECTING});
            await state.miniPanel.close();
        }
    }

    setDisconnected() {
        this.state.set({type: ViewModel.STATE_DISCONNECTED});
        this.currentMiniPanel = undefined;
    }

    async setId(miniPanel) {
        const id = await miniPanelStorage.set(miniPanel);
        this.id.set(id);
        return id;
    }

    async setEnableOnMeet(isEnabled) {
        await chrome.storage.local.setAsync({[ViewModel.ENABLE_ON_MEET_KEY]: isEnabled});
    }
}

const viewModel = new ViewModel();