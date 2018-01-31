/**
 * Created by igor on 29.09.16.
 */


/**
 * TODO

 /tmp/.io.nwjs.vzMqiv/lib/verto.js:3569
 peer.close();


 * @type {number}
 */

const MAX_CALL_COUNT = 5;


class Session {
	constructor (auth = {}, key, token, cdr) {
        this._x_key = key;
        this._x_token = token;

        this._notificationMissed = null;
        this._notificationNewCall = null;
        this.ring = null;

        this.selectedVideo = null;
        this.selectedSpeaker = null;
        this.selectedAudio = null;
        this.useVideo = null;
        this.alwaysOnTop = false;
        this.autoLoginCC = false;
        this.useSIPAutoAnswer = false;

        this.reloadSettings();

        this.uri = parseServerUriEngine(auth.serverEngine);

        this.lastCallNumber = null;
        this.activeCalls = {};
        this.activeCall = null;

        this.conference = {};
        this.videoParams = {};

        this.acl = null;
        this._cdrUrl = null;

        if (cdr && String(cdr.useProxy) === 'false' && cdr.host) {
            this._cdrUrl = cdr.host.replace(/\/$/, '')
        } else {
            this._cdrUrl = this.uri.http;
        }

        this.vertoLogin = (auth.login || '');
        this.myNumber = this.vertoLogin.split('@')[0];
        this.webitelUser = null;

        this.cidName = null;
        this.cidNumber = null;

        // if (Helper.videoParamsBest[this.selectedVideo]) {
        //     this.videoParams = {
        //         minWidth: Helper.videoParamsBest[this.selectedVideo].w,
        //         minHeight: Helper.videoParamsBest[this.selectedVideo].h,
        //         maxWidth: Helper.videoParamsBest[this.selectedVideo].w,
        //         maxHeight: Helper.videoParamsBest[this.selectedVideo].h,
        //         // TODO move conf
        //         minFrameRate: 15
        //     }
        // } else if (Object.keys(Helper.videoParamsBest).length === 1) {
        //     let bp = Helper.videoParamsBest[Object.keys(Helper.videoParamsBest)[0]];
        //     this.videoParams = {
        //         minWidth: bp.w,
        //         minHeight: bp.h,
        //         maxWidth: bp.w,
        //         maxHeight: bp.h,
        //         // TODO move conf
        //         minFrameRate: 15
        //     }
        // }

        this.isLogin = false;

        // TODO
        var options = {};
        this._settings = options;


        this.webitel = new Webitel({
            server : this.uri.ws,
            account: this.vertoLogin,
            key: this._x_key,
            token: this._x_token,
            debug  : true,
            reconnect: -1
        });

        this.webitel.onError(function (err) {
            //console.error(err);
        });

        this.webitel.onUserStatusChange( (e) => {
            const a = this.getAgentById(e.id);
            if (a) {
                a.state = e.state;
                a.away = e.away;
                a.stateName = getStateName(e.state, e.away);
                if (this.webitelUser && a.id === this.myNumber) {

                    if (e.inCC !== this.webitelUser.inCC) {
                        a.inCC = e.inCC;
                        Helper.changeTrayMenu(true, this.webitelUser.inCC);
                    }
                    this.webitelUser = a;
                    Helper.sendSession('onMyStatusChange', this.webitelUser);
                    if (mustLoginCC) {
                        this.loginCC();
                        mustLoginCC = false;
                    }
                } else {
                    a.inCC = e.inCC;
                }
                //TODO
            }
        });

        this.webitel.onNewCall(webitelCall => {

            if (Object.keys(this.activeCalls).length >= MAX_CALL_COUNT) {
                this.dropCall(webitelCall.uuid);
                return;
            }

            this.activeCalls[webitelCall.uuid] = new Call(webitelCall, null);
            const call = this.activeCalls[webitelCall.uuid];
            if (this.usePostProcess && webitelCall.direction === "outbound") {
                // call.postProcessId = webitelCall.uuid;
            }
            call.setWebitelInfo(webitelCall);

            if (Object.keys(this.activeCalls).length === 1) {
                this.setViewCall(call.id, true)
            } else {
                Helper.sendSession('changeCall', this.activeCalls);
            }
        });

        this.webitel.onHangupCall(webitelCall => {
            if (!this.activeCalls.hasOwnProperty(webitelCall.uuid)) {
                return;
            }
            this.setPostProcess(webitelCall);
        });

        this.webitel.onAcceptCall(webitelCall => {
            const call = this.activeCalls[webitelCall.uuid] || this.activeCalls[webitelCall["call-channel-uuid"]];
            //TODO for alow dialer

            if (call) {
                call.uuid = webitelCall['my-uuid'];
                this.setViewCall(call.id, true);
                call.setState('active')
            }
            if (this.usePostProcess && call && webitelCall.direction !== "outbound" && webitelCall.data && ~webitelCall.data.indexOf("dlr_member_id")) {
                call.postProcessId = webitelCall.dbUuid;
            }
            Helper.sendSession('changeCall', this.activeCalls);
        });

        this.webitel.onHoldCall(webitelCall => {
            const call = this.activeCalls[webitelCall.uuid];
            if (call) {
                call.setState('held')
            }
            Helper.sendSession('changeCall', this.activeCalls);
        });

        this.webitel.onUnholdCall(webitelCall => {
            const call = this.activeCalls[webitelCall.uuid];
            if (call) {
                call.setState('active');
                Helper.sendSession('changeCall', this.activeCalls);
                this.setViewCall(call.id, true)
            }
        });

        this.webitel.onDtmfCall(webitelCall => {
            console.log(webitelCall)
        });

        let mustLoginCC = false;

        this.webitel.onReady( (user) => {

            //TODO handle error
            this.acl = user.acl;

            this.webitel.getAgentsList( list => {
                this.internalUsers = list.map((agent) => {
                    if (agent.id === this.myNumber) {
                        this.webitelUser = agent;

                        this.cidName = agent.name;
                        this.cidNumber = agent.id;

                        Helper.changeTrayMenu(true, this.webitelUser.inCC);

                        mustLoginCC = !this.webitelUser.inCC && this.webitelUser.agent === true && this.autoLoginCC === true;
                        if (mustLoginCC && this.webitelUser.state !== 'NONREG') {
                            mustLoginCC = false;
                            this.loginCC();
                        }

                        Helper.sendSession('onMyStatusChange', this.webitelUser);

                    }
                    agent.stateName = getStateName(agent.state, agent.away);
                    return agent;
                });
            });
        });

        this.webitel.onDisconnect( () => {
            Helper.changeTrayMenu();
            Helper.setView('login', false, null);
        });

        this.internalUsers = [];

        this.webitel.connect();

        this.services = {
            cdr: new CDR(this)
        };

        //TODO
        setTimeout(() => {
            Helper.setView('history', false, null);
        }, 10);
    }

    getService(name) {
	    return this.services[name];
    }

    setActiveCall(uuid) {
        this.activeCall = uuid;
    }

    getActiveCall() {
        return this.activeCall;
    }

    findActiveCallByUuid (uuid) {
        const channels = this.webitel.getChannelsByCall(uuid);
        for (let i = 0; i < channels.length; i++) {
            if (this.activeCalls.hasOwnProperty(channels[i])) {
                return this.activeCalls[channels[i]]
            }
        }
        return null;
    }

    reloadSettings () {
        let _interface = {};
        try {
            _interface = JSON.parse(localStorage.getItem('interface')) || {};
        } catch (e) {
        }

        this._notificationMissed = _interface.notificationMissed;
        this._notificationNewCall = _interface.notificationNewCall;
        this.useSIPAutoAnswer = _interface.useSIPAutoAnswer;
        this.ring = './sound/iphone.mp3';
        this.isRingNotification = _interface.ring;

        this.usePostProcess = _interface.usePostProcess;

        this.selectedVideo = _interface.selectedVideo;
        this.selectedSpeaker = _interface.selectedSpeaker;
        this.selectedAudio = _interface.selectedAudio;
        this.autoAnswer = _interface.autoAnswer;

        this.useVideo = _interface.useVideo;

        this.alwaysOnTop = _interface.alwaysOnTop || false;
        this.autoLoginCC = _interface.autoLoginCC || false;
        this.onDemand = _interface.onDemand || false;
        this.ringerDevice = _interface.ringerDevice || "any";

        if (this.verto) {
            this._setRinger();
            this.verto.options.useSpeak = this.selectedAudio || "any";
        }

        if (Helper.phoneWindow) {
            Helper.phoneWindow.setAlwaysOnTop(this.alwaysOnTop);
        }
    }

    _setRinger() {
        this.verto.ringer[0].volume =  this.isRingNotification ? 1 : 0;
        this.verto.ringer[0].setSinkId(this.ringerDevice);
    }

    notificationMissed () {
	    return this._notificationMissed;
    }

    notificationNewCall () {
	    return this._notificationNewCall;
    }

    request (method = "GET", url, body, cb) {
        $.ajax({
            xhr: () => Helper.getXHR(),
            url: this.uri.http + url,
            contentType: "application/json",
            cache: false,
            xhrFields: {
                withCredentials: true
            },
            data: body,
            headers: {
                "x-access-token": this._x_token,
                "x-key": this._x_key
            },
            method
        })
            .done( data => cb(null, data))
            .error( (a,b, c) => {
                if (a.responseJSON) {
                    this.showUrlError(url, a.responseJSON.info || c)
                }
                cb(b)
            })
        ;
    }

    showUrlError (url, message) {
        Helper.createNotificationMsg(
            'Api',
            message,
            url,
            '../images/error64.png',
            3000
        );
    }

    cdrRequest (method = "GET", url, body, cb) {
        $.ajax({
            xhr: () => Helper.getXHR(),
            url: this._cdrUrl + url,
            contentType: "application/json",
            cache: false,
            xhrFields: {
                withCredentials: true
            },
            data: body,
            headers: {
                "x-access-token": this._x_token,
                "x-key": this._x_key
            },
            method
        })
        .done( data => {
            cb(null, data)
        })
        .error( (a,b, c) => {
            if (a.responseJSON) {
                this.showUrlError(url, a.responseJSON.info || c)
            }
            cb(b)
        });
    }

    getCdrFileUri (id, name, fileName, type) {
        let uri = this._cdrUrl + "/api/v2/files/" +
            id + "?access_token=" + this._x_token +
            "&x_key=" + this._x_key;
        if (name)
            uri += "&name=" + name + "&file_name=" + fileName + "_" + name + "." + type;
        return uri;
    }

    loginCC () {
        let param = null;
        if (this.onDemand === true) {
            param = {'status': "Available (On Demand)"};
        }
        this.webitel.loginCallCenter(param, () => {

        })
    }

    getAgentById (id) {
        for (let agent of this.internalUsers)
            if (agent.id === id)
                return agent;
    }

    setPostProcess (call) {
        this.activeCalls[call.uuid].onHangupTime = Date.now();
        this.activeCalls[call.uuid].destroy();
	    if (this.activeCalls[call.uuid].postProcessId) {
            this.activeCalls[call.uuid].setState('postProcess');

            this.openMenu(call.uuid, 'postProcess');
        } else {
            this.closeCall(call.uuid)
        }
    }

    savePostProcess (call) {
        console.log(call);

        if (call.state === "postProcess") {

            if (call.webitelDataPrivate && call.webitelDataPrivate.dlr_member_id) {
                let body = {};
                body.success = !!call.privateVariables.dlrSuccess;

                if (call.comment) {
                    body.description = call.comment;
                }

                if (!body.success) {
                    // next_after_sec stop_communications reset_retries next_communication
                    if (call.privateVariables.dlrAddNewNumber) {
                        body.next_communication = call.privateVariables.dlrAddNewNumber;
                    }

                    if (+call.privateVariables.dlrAfterMin > 0) {
                        body.next_after_sec = +call.privateVariables.dlrAfterMin * 60;
                    }

                    if (call.privateVariables.dlrDoNotCallThisNumber) {
                        body.stop_communications = call.displayNumber;
                    }
                }

                this.request(
                    "PUT",
                    `/api/v2/dialer/${call.webitelDataPrivate.dlr_id}/members/${call.webitelDataPrivate.dlr_member_id}/status`,
                    JSON.stringify(body),
                    (err, res) => {

                    }
                )
            } else if (call.comment || call.vote > 0){
                this.cdrRequest("POST", `/api/v2/cdr/${call.postProcessId}/post`, JSON.stringify({
                    comment: call.comment,
                    vote: call.vote
                }), (err, res) => {
                    //TODO check error
                });
            }

            this.closeCall(call.id);
        } else {
            this.openMenu(call.id, '')
        }
    }

    closeCall (id) {
        delete this.activeCalls[id];
        Helper.sendSession('changeCall', this.activeCalls);
        const otherCalls = Object.keys(this.activeCalls);
        if (otherCalls.length > 0) {
            this.setViewCall(otherCalls[0], true);
        } else {
            Helper.setView(Helper.state._prevActiveTabName);
        }
    }

    logout () {
        try {
            this.verto.logout();
        } catch (e) {
            console.log(e);
        }

        try {
            this.webitel.disconnect();
        } catch (e) {
            console.error(e);
        }
        this.webitel = null;

        return true;
    }

    getLastCallNumber () {
        return this.lastCallNumber || "";
    }

    getDevicesList () {
        return {
            audioInDevices: $.verto.audioInDevices,
            audioOutDevices: $.verto.audioOutDevices,
            videoDevices: $.verto.videoDevices
        }
    }

    openMenu (id, name) {
        const call = this.activeCalls[id];
        if (call) {
            if (call.state === "postProcess") {
                name = 'postProcess'
            }
            call.openMenu(name);
            Helper.sendSession('changeCall', this.activeCalls);
        }
    }

    openVideo (id) {
        const call = this.activeCalls[id];
        let scope = this;
        if (call && call.initRemoteStream) {
            console.warn('open window');
            const title = ' ' + call.calleeIdNumber + ' (' + call.calleeIdName + ')';
            var screenShareCallStreamSrc = call.screenShareCallStreem;
            chrome.app.window.create('./app/view/videoCall2.html',
                {
                    id: id,
                    alwaysOnTop: this.alwaysOnTop,
                    innerBounds: {
                        width: 800,
                        height: 480
                    }
                },
                (window) => {
                    window.contentWindow.onload = function (e) {
                        call.videoWindow = true;
                        this.init(Helper.session, call);
                        this.document.title += title;
                        var videoLeft = e.target.getElementById('remoteVideoLeft');
                        var videoL = e.target.getElementById('localVideo');
                        var stream = scope.getCallStream(id);
                        if (stream) {
                            videoLeft.srcObject = stream.remoteStream;
                            videoLeft.volume = 0;
                            videoLeft.play();
                            // videoL.srcObject = stream.localStream;
                            // videoL.volume = 0;
                            // videoL.play();
                            if (screenShareCallStreamSrc) {
                                var videoRight = e.target.getElementById('remoteVideoRight');
                                videoRight.volume = 0;
                                videoRight.src = screenShareCallStreamSrc;
                                videoRight.play();
                            }

                        }
                    };
                    window.onClosed.addListener(() => {
                        if (call) {
                            call.videoWindow = false;
                        }
                    });
                }
            );
        }
    }

    // region call controll

    makeCall (number, option = {}) {
        this.lastCallNumber = number;
        this.webitel.call(number, false, this.useSIPAutoAnswer);
    }

    bridgeChannel (legA, legB) {
	    //TODO callback ?
	    this.webitel.bridgeChannel(legA, legB)
    }

    dropCall (id) {
        const call = this.activeCalls[id];
        if (call) {
            call.userDropCall = true;
            this.webitel.hangup(id);
        }
    }

    answerCall (id, params) {
        //TODO
    }

    setVar (id, varName, varVal) {
        const call = this.activeCalls[id];
        if (call) {
            call.setVar(varName, varVal);
        }
    }

    setViewCall (id, isView) {
        const call = this.activeCalls[id];
        if (call) {
            call.setView(isView);
            this.setActiveCall(id);
            Helper.sendSession('changeCall', this.activeCalls);
            Helper.setView('call', false, null);

            for (let key in this.activeCalls) {
                if (key !== call.id) {
                    this.holdCall(key);
                } else if (call.state === 'held') {
                   // this.unholdCall(call.id)
                }
            }
        }
    }

    setVote (id, vote) {
        const call = this.activeCalls[id];
        if (call) {
            call.setVote(vote);
        }
    }

    setComment (id, comment) {
        const call = this.activeCalls[id];
        if (call) {
            call.setComment(comment);
        }
    }

    setTags (id, tags) {
        const call = this.activeCalls[id];
        if (call) {
            call.setTags(tags);
        }
    }

    holdCall (id) {
        this.webitel.hold(id);
    }

    unholdCall (id) {
        this.webitel.unhold(id);
    }

    toggleHold (id) {
        this.webitel.toggleHold(id);
    }

    dtmf (id, digit) {
        const call = this.activeCalls[id]
            ;
        if (call) {
            call.dtmf(digit);
        }    

        this.webitel.dtmf(id, digit);

        Helper.sendSession('changeCall', this.activeCalls);    
    }

    transfer (id, dest) {
        this.webitel.transfer(id, dest);
    }

    toggleMute (id) {
        const call = this.activeCalls[id],
            dialog = this.verto.dialogs[id]
            ;

        if (call && dialog) {
            call.setMute(dialog.setMute('toggle'));
            Helper.sendSession('changeCall', this.activeCalls);
        }        
    }

    toggleMuteVideo (id) {
        const call = this.activeCalls[id],
            dialog = this.verto.dialogs[id]
            ;

        if (call && dialog) {
            call.setMuteVideo(dialog.setVideoMute('toggle'));
            // Helper.sendSession('changeCall', this.activeCalls);
        }
    }

    // endregion
}

const getStateName = (state, status) => {
    if (state === 'NONREG') {
        return 'state-no-reg'
    } else if (state === 'ONHOOK' && status === 'NONE' ) {
        return 'state-waiting'
    } else if (state === 'ISBUSY' && status === 'ONBREAK') {
        return 'state-on-break'
    } else {
        return 'state-busy'
    }
};

function parseServerUriEngine (serverStr) {
    let serverUri = '',
        wsUri = ''
    ;

    if (serverStr.indexOf('ws') === 0) {
        serverUri = serverStr.replace(/ws/, 'http');
        wsUri = serverStr;
    }
    else if (serverStr.indexOf('http') === 0) {
        serverUri = serverStr;
        wsUri = serverStr.replace(/http/, 'ws')
    } else {
        serverUri = 'http://' + serverStr;
        wsUri = 'ws://' + serverStr;
    }

    return {
        http: serverUri,
        ws: wsUri
    };
}