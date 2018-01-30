/**
 * Created by igor on 27.09.16.
 */

"use strict";

const CONTEXT_MENU_ID = 'selectAndCallWebitel';


class Extension {
    constructor () {
        this.port = null;
        this.contextMenu = null;

        this.initCTITelephony();

        Helper.init();
    }

    get NOT_INSTALL_TITLE () {
        return `No install '${VERTO_APP_NAME}'`;
    }

    get NOT_INSTALL_MSG () {
        return `Please install '${VERTO_APP_NAME}'`;
    }

    get NOT_RUN_TITLE() {
        return `Is not running ${VERTO_APP_NAME}`;
    }

    get NOT_RUN_MSG() {
        return `Please enable ${VERTO_APP_NAME}`;
    }

    get NO_SETTINGS_TITLE () {
        return `No settings ${VERTO_APP_NAME}`;
    }
    get NO_SETTINGS_MSG () {
        return `Please set settings ${VERTO_APP_NAME}`;
    }

    createContextMenu () {
        this.contextMenu = chrome.contextMenus.create({
            id: CONTEXT_MENU_ID,
            type: 'normal',
            title: 'Call',
            contexts: ['selection']
        });
    }

    removeContextMenu () {
        if (this.contextMenu) {
            chrome.contextMenus.remove(CONTEXT_MENU_ID);
            this.contextMenu = null;
        }
    }

    setError (err) {
        console.error(err);
    }

    onMessage (data) {
    }

    sendMethod (method, params) {

    }

    onClickCallMenu (number) {
        console.log(number);
    }

    onChangeActiveCalls (calls) {}

    changeIcon (iconName) {
        chrome.browserAction.setIcon({path: `images/${iconName}`});
    }

    makeCall (number) {
        //TODO
        Helper.session.makeCall(number);
    }

    hangupCall () {

    }

    initCTITelephony () {
        this.CTITelephony = new Process();
        this.CTITelephony.init();

        chrome.extension.onRequest.addListener((request, sender, sendResponse) => {
            if (request.pageLoad && pref.get('enabled'))
                sendResponse({ parseDOM: true });

            if (request.hasOwnProperty('number')) {
                this.makeCall(request.number)
            }
        });

        window.setInterval(() => {
            this.CTITelephony.isPageComplete();
        }, 5000);
    }

    c2cEnabled () {
        return pref.get("enabled");
    }

    c2cToggle () {
        var ON = pref.get('enabled');
        console.log(ON);
        if (ON) {
            this.CTITelephony.disable();
        } else {
            this.CTITelephony.enable();
        }
    }
}

var pref = Preferences; // alias for the Preferences object
var ext = new Extension();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request.action) {
        return;
    }

    switch (request.action) {
        case "login":
            Helper.login(request.data);
            break;
    }
});
