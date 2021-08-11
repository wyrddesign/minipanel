#include "IXSplitScriptDllContext.h"
#include "ButtonPanel.h"

unique_ptr<ButtonPanel> buttonPanel;

bool addKeyPressListener(IXSplitScriptDllContext *pContext) {
    if (buttonPanel) {
        return FALSE;
    }
    // Register the button panel if it's not registered yet.
    buttonPanel = ButtonPanel::probe();
    if (buttonPanel) {
        buttonPanel->listenForever([pContext](unique_ptr<Message> message) -> unique_ptr<Message>{
            // msgPressKey(1);
            // BSTR args[1] = {buttonPanel->getMessageKey(message)};
            // // This will call OnDll<function name>
            // if (pContext->Callback(L"KeyPress", args, 1)) {
            //     buttonPanel->sendLightKey(buttonPanel->getMessageKey());
            // }
            return unique_ptr<Message>();
        });
    }
    return TRUE;
}

extern "C" {
    BOOL WINAPI XSplitScriptPluginInit() {
        return TRUE;
    }

    BOOL WINAPI XSplitScriptPluginCall(IXSplitScriptDllContext *pContext, BSTR functionName, BSTR *argumentsArray, UINT argumentsCount, BSTR *returnValue) {       
        if (lstrcmpW(functionName, L"ButtonPanel.AddKeyPressListener") == 0) {
            return addKeyPressListener(pContext);
        } else {
            return FALSE;
        }
    }

    void WINAPI XSplitScriptPluginDestroy() {

    }
}