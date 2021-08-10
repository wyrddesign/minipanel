const chooseMiniPanelNode = document.getElementById("chooseMiniPanel");
const miniPanelMessagesNode = document.getElementById("miniPanelMessages");
const miniPanelIdNode = document.getElementById("miniPanelId");

async function setMiniPanelId() {
    miniPanelIdNode.value = await miniPanelStorage.getId();
}

chooseMiniPanelNode.addEventListener("click", async () => {
    miniPanelMessagesNode.textContent += "Probing for MiniPanel.\n";
    const miniPanel = await MiniPanel.fromUser();
    if (miniPanel) {
        miniPanelMessagesNode.textContent += "Found MiniPanel.\nWaiting for key presses.\n";
        await miniPanelStorage.set(miniPanel);
        await setMiniPanelId();
        miniPanel.listenForever(async (message) => {
            miniPanelMessagesNode.textContent += JSON.stringify(message) + "\n";
        });
    }
});


setMiniPanelId();
