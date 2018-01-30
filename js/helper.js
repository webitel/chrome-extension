/**
 * Created by igor on 30.09.16.
 */

"use strict";


var Helper = {
    _hidden: false,
    session: null,
    uri: null,
    view: "init",
    phoneWindow: null,
    missedNotifications: {},
    videoParamsBest: {},
    extensionPort: null,

    init: () => {
        console.log("INIT");
        const auth = Helper.getAuthStorage();
        if (auth && auth.serverEngine && localStorage.getItem('x_key') && localStorage.getItem('x_token')) {
            Helper.whoami(auth);
        } else {
            Helper.sendSession('init', {tabName: 'login', manifest: Helper._manifest});
        }
        Helper.changeTrayMenu();
    },


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
            Helper.sendSession('unauthorized', {});

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
        Helper.sendSession('logout', {});
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
            Helper.sendSession('unauthorized', {});
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

    toggleShow: () => {
        if (!Helper.phoneWindow)
            return;

        Helper._hidden = !Helper._hidden;

        if (Helper._hidden) {
            Helper.hide();
        } else {
            Helper.show();
        }
    },

    hide: () => {
    },
    show: () => {
    },

    focus: () => {
    },


    getSettings: (cb) => {
        if (Helper.session && Helper.session._settings)
            return cb(Helper.session._settings);

        let settings = {
            iceServers: true,
            ring: true,
            alwaysOnTop: true
        };

        function copyTo(to, from) {
            for (var key in from) {
                if (from.hasOwnProperty(key)) {
                    to[key] = from[key]
                }
            }
        }

        const storage = localStorage.getItem('settings');
        if (storage) {
            try {
                settings = JSON.parse(storage);
            } catch (e) {
                console.error(e);
            }
        }

        cb(settings, localStorage.getItem('x_key'), localStorage.getItem('x_token'));
    },

    setSettings: (data, cb) => {
        var sync = {};
        var local = {};

        for (var key in data) {
            if (!data.hasOwnProperty(key)) continue;
            local[key] = data[key];
        }
        localStorage.setItem('settings', JSON.stringify(local));
        cb()
    },

    saveSettings: (data) => {
        if (!data.sessid ) {
            data.sessid = $.verto.genUUID();
        }

        Helper.setSettings(data, () => {
            // if (Helper.session) {
            //     Helper.session.logout();
            // }
            //
            // Helper.session = new Session(data);
            //
            // if (Helper.phoneWindow)
            //     Helper.phoneWindow.window.vertoSession = Helper.session;

            Helper.createNotificationMsg('Save', 'Saved settings', '', './images/success64.png', 2000);
        });
    },

    setView: (view) => {
        Helper.view = view;
    },

    getView: () => {
        return Helper.view;
    }
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