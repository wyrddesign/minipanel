#ifndef IXSPLITSCRIPTDLLCONTEXT_H
#define IXSPLITSCRIPTDLLCONTEXT_H

#include <Windows.h>
#include <OleAuto.h>

extern "C" {
    //[uuid("9A554D8A-912F-4F1E-9A26-CC002B3B99BD")]
    DECLARE_INTERFACE_(IXSplitScriptDllContext,IUnknown) {
        STDMETHOD(Callback)(BSTR functionName, BSTR *argumentsArray, UINT argumentsCount) PURE;
    };

    BOOL WINAPI XSplitScriptPluginInit();

    BOOL WINAPI XSplitScriptPluginCall(IXSplitScriptDllContext *pContext, BSTR functionName, BSTR *argumentsArray, UINT argumentsCount, BSTR *returnValue);

    void WINAPI XSplitScriptPluginDestroy();
}

#endif