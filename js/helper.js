/**
 * Created by igor on 30.09.16.
 */

"use strict";

const VIEW_FOLDER = 'app/view/';

var Helper = {
    _hidden: false,
    session: null,
    uri: null,
    view: "init",
    phoneWindow: null,
    missedNotifications: {},
    videoParamsBest: {},
    extensionPort: null,
    state: {
        currentViewTemplate: VIEW_FOLDER + "init" + ".html",
        currentViewData: null,
        _prevActiveTabName: null,
        activeTabName: null,
        search: "",
    },

    init: () => {

        const auth = Helper.getAuthStorage();
        if (auth && auth.serverEngine && localStorage.getItem('x_key') && localStorage.getItem('x_token')) {
            Helper.whoami(auth);
        } else {
            // Helper.sendSession('init', {tabName: 'login', manifest: Helper._manifest});
            Helper.setView('login', false, null);
        }
        Helper.changeTrayMenu();
    },

    setState: (state) => {
        Helper.state = state;
    },

    getState: () => Helper.state,


    getVersion: () => {
        return 0
    },

    getSession: () => Helper.session,
    getActiveCalls: () => {
        const res = [];
        if (Helper.getSession()) {
            for (let key in Helper.session.activeCalls) {
                res.push(Helper.session.activeCalls[key]);
            }
        }
        return res;
    },

    setSearch: v => {
        Helper.state.search = v || "";
    },

    getActiveCall: () => {
        if (Helper.getSession()) {
            return Helper.session.activeCalls[Helper.session.activeCall];
        } else {
            return null
        }
    },

    getAuthStorage: () => {
        const auth = localStorage.getItem('auth');
        if (!auth)
            return null;

        try {
            return JSON.parse(auth)
        } catch (e) {
            return null
        }
    },

    getXHR: () => {
        return new window.XMLHttpRequest();
    },

    login: (auth) => {

        if (!auth || !auth.serverEngine) {
            Helper.sendSession('unauthorized', {});
            return;
        }

        localStorage.setItem('serverEngine', auth.serverEngine);
        localStorage.setItem('iceServers', auth.iceServers || false);

        $.ajax({
            url: parseServerUri(auth.serverEngine) + '/login',
            xhr: () => Helper.getXHR(),
            cache: false,
            contentType: "application/json",
            data: JSON.stringify({
                "username": auth.login,
                "password": auth.password,
            }),
            method: "POST"
        })
        .done( data => {
            localStorage.setItem('x_key', data.key);
            localStorage.setItem('x_token', data.token);

            localStorage.setItem('auth', JSON.stringify(auth));
            Helper.session = new Session(auth, data.key, data.token, data.cdr, data.verto);
        })
        .error( (a, b, c) => {
            if (a.responseJSON && a.responseJSON.info) {
                Helper.showLoginApiError(a.responseJSON.info);
            } else {
                Helper.showLoginApiError(c);
            }

            localStorage.removeItem('x_token');
            localStorage.removeItem('x_key');
            Helper.setView('login', false, null);
        })
        ;
    },

    showLoginApiError: (message) => {
        Helper.showErrorMsg('Auth', message)
    },

    showErrorMsg: (head, message) => {
        Helper.createNotificationMsg(
            head,
            message,
            '',
            '../images/error64.png',
            3000
        );
    },

    logout: () => {
        localStorage.removeItem('x_token');
        localStorage.removeItem('x_key');
        if (Helper.session) {
            Helper.session.logout();
            Helper.session = null;
        }
        Helper.changeTrayMenu();
        Helper.setView('login', false, null);
    },

    whoami: (auth) => {
        $.ajax({
            url: parseServerUri(auth.serverEngine) + '/api/v2/whoami',
            cache: false,
            headers: {
                "x-access-token": localStorage.getItem('x_token'),
                "x-key": localStorage.getItem('x_key')
            },
            method: "GET"
        })
        .done( data => {
            Helper.session = new Session(auth, localStorage.getItem('x_key'), localStorage.getItem('x_token'), data.cdr, data.verto);
        })
        .error( () => {
            localStorage.removeItem('x_token');
            localStorage.removeItem('x_key');
            Helper.setView('login', false, null);
        });
    },

    changeTrayMenu: (logged, ccIn) => {

    },


    deleteDomain: (param) => {
        if (typeof param === "string") {
            let i = param.indexOf('@');
            if (~i) {
                param = param.substr(0, i);
            }
        }
        return param;
    },

    sendSession: (action, obj) => {
        console.log(action);
        chrome.runtime.sendMessage({
            action: action,
            data: obj
        });
    },

    getWindowById: (id) => {
    },

    clearNotificationId: (id) => {
        chrome.notifications.clear(id);
    },

    createNotificationMsg: (title, messsage, contextMessage, imgUri, time) => {
        Helper.createNotification({
            type: 'basic',
            iconUrl: imgUri || './images/phone16.png',
            title: title,
            message: messsage,
            contextMessage: contextMessage
        }, (id) => {
            console.log(id);
            if (time)
                setTimeout(() => {
                    // chrome.notifications.clear(id)
                }, time)
        });
    },

    createNotification: (params, cb) => {
        chrome.notifications.create(params, cb);
    },

    hide: () => {
    },
    show: () => {
    },

    focus: () => {
    },

    setView: (view, isPage, data) => {
        if (!view) {
            view = 'history';
        }
        let newTemplate = view;
        if (view !== 'call') {
            Helper.state.activeTabName = view;
            Helper.state._prevActiveTabName = Helper.state.activeTabName || "history";
        }
        if (isPage) {
            newTemplate += 'Page';
        }
        Helper.state.currentViewData = data;
        Helper.state.currentViewTemplate = VIEW_FOLDER + newTemplate + '.html';
        Helper.sendSession('state', Helper.state);
        return Helper.state;
    },
};


function parseServerUri (serverStr) {
    if (serverStr.indexOf('ws') === 0) {
        return serverStr.replace(/ws/, 'http');
    }
    else if (serverStr.indexOf('http') === 0) {
        return serverStr;
    } else {
        return 'http://' + serverStr;
    }
}