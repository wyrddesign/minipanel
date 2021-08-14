class Property {
    constructor(initialValue) {
        this.value = initialValue;
        this.listeners = [];
    }
    listen(listener) {
        this.listeners.push(listener);
    }
    removeListener(listener) {
        this.listeners.remove(listener);
    }
    set(value) {
        this.value = value;
        this.listeners.forEach((listener) => listener(this.value));
    }
    get() {
        return this.value;
    }
}

class ViewModel {
    static STATE_CONNECTING = 0;
    static STATE_CONNECTED = 1;
    static STATE_DISCONNECTING = 2
    static STATE_DISCONNECTED = 3;

    constructor() {
        this.state = new Property({type: ViewModel.STATE_DISCONNECTED});
        this.currentMiniPanel = new Property();
        this.id = new Property();
    }
    setConnecting() {
        this.state.set({type: ViewModel.STATE_CONNECTING});
    }
    setConnected(miniPanel) {
        if (miniPanel) {
            this.state.set({type: ViewModel.STATE_CONNECTED, miniPanel: miniPanel});
            this.currentMiniPanel = miniPanel;
        } else {
            this.setDisconnected();
        }
    }
    async disconnect() {
        const state = this.state.get();
        if (state.type == ViewModel.STATE_CONNECTED) {
            this.state.set({type: ViewModel.STATE_DISCONNECTING});
            await state.miniPanel.close();
        }
    }
    setDisconnected() {
        this.state.set({type: ViewModel.STATE_DISCONNECTED});
        this.currentMiniPanel = undefined;
    }
}

const viewModel = new ViewModel();