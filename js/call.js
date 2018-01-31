/**
 * Created by igor on 30.09.16.
 */

"use strict";
class Call {
    /*
        dialog
     */
    constructor (call) {
        this.id = call.uuid;
        this.uuid = null;
        this.direction = call.direction;
        this.answered = false;

        this.calleeIdName = call.calleeName;
        this.calleeIdNumber = Helper.deleteDomain(call.calleeNumber);
        this.callerIdName = call.callerName;
        this.callerIdNumber = Helper.deleteDomain(call.callerNumber);
        this.useVideo = false;
        this.state = 'newCall';
        this.onActiveTime = null;
        this.menuName = '';
        this.mute = false;
        this.muteVideo = false;
        this.userDropCall = false;

        this.isView = true;

        this.displayName = call.displayNumber;
        this.displayNumber = call.displayNumber;

        this.vote = null;
        this.comment = "";
        this.tags = "";
        this.webitelData = {

        };
        this.webitelDataPrivate = {

        };

        this.privateVariables = {};

        this.postProcessId = null;
        
        this.initRemoteStream = false;
        this.screenShareCall = null;
        this.screenShareCallStreem = null;
        this.screenShareCallDirection = null;
        this.dtmfArray = [];
        this.conferenceId = null;
        this.videoWindow = false;
        this.otherLegUuid = null;

        this.setWebitelInfo(call);

        // TODO
        this.onChange = null;

        this.contact = null;
        this.createdOn = Date.now();

        if (this.direction === "inbound") {
            this.showNewCall();
        }
    }

    setView (view) {
        this.isView = view;
    }

    setVar (varName, varVal) {
        this.privateVariables[varName] = varVal
    }

    setWebitelInfo (webitelCall) {
        try {
            const data = webitelCall.variable_webitel_data || webitelCall.data; //TODO...
            if (data && data !== "undefined") {
                const wData = JSON.parse(data.replace(/'/g, ''));
                for (let key in wData) {
                    if (~PROTECTED_WEBITEL_DATA.indexOf(key)) {
                        this.webitelDataPrivate[key] = wData[key];
                    } else {
                        this.webitelData[key] = wData[key];
                    }
                }
            }
        } catch (e) {
            this.webitelData = {};
        }

        this.otherLegUuid = webitelCall['other-leg-unique-id'] || null;
        Helper.sendSession('changeCall', Helper.session && Helper.session.activeCalls);//TODO
    }

    setVote (vote) {
        this.vote = vote;
    }

    setComment (comment) {
        this.comment = comment;
    }

    setTags (tags) {
        this.tags = tags;
    }

    removeScreenShareCall () {
        this.screenShareCall = null;
        this.screenShareCallStreem = null;
        this.screenShareCallDirection = null;

        var w = Helper.getWindowById(this.id);
        if (w && !this.conferenceId) {
            w.contentWindow.document.getElementById('remoteVideoRight').src = '';
            // w.contentWindow.document.getElementsByClassName('right')[0].style.display = 'none'

        }
        if (typeof this.onChange === 'function') {
            this.onChange('removeScreenShareCall');
        }
    }

    setMute (mute) {
        this.mute = mute;
    }

    setMuteVideo (mute) {
        this.muteVideo = mute;
    }

    dtmf (digit) {
        if (this.dtmfArray.push(digit) === 1) {
            // this.calleeIdNumber += ':';
        }

        // this.calleeIdNumber+= digit;
    }

    setState (state) {
        this.state = state;
        if (!this.onActiveTime && state === 'active') {
            this.onActiveTime = Date.now();
            this._clearNotification()
        }
    }

    openMenu (name) {
        this.menuName = name;
    }

    _clearNotification () {
        if (this.notificationId)
            Helper.clearNotificationId(this.notificationId);
    }

    destroy () {
        this._clearNotification();
        this.onChange = null;
 
        if (!this.userDropCall && !this.onActiveTime && this.direction === "inbound")
            this.showMissed();
    }

    setScreenShareCall (d) {
        this.screenShareCall = d.callID;
        this.screenShareCallDirection = d.direction.name;

        var screenShareCallStreamSrc = this.screenShareCallStreem = URL.createObjectURL(d.rtc.remoteStream || d.rtc.localStream);

        var w = Helper.getWindowById(this.id);
        if (w && !this.conferenceId) {
            var videoRight = w.contentWindow.document.getElementById('remoteVideoRight');
            videoRight.volume = 0;
            videoRight.src = screenShareCallStreamSrc;
            videoRight.play();

            // w.contentWindow.document.getElementsByClassName('right')[0].style.display = 'flex'
        } else if (Helper.session) {
            Helper.session.openVideo(this.id);
        }

        if (typeof this.onChange == 'function') {
            this.onChange('setScreenShareCall');
        }
    }

    showNewCall () {
        const session = Helper.session;
        if  (session && session.notificationNewCall()) {
            Helper.createNotification({
                type: 'basic',
                iconUrl: './images/call64.png',
                title: "New call",
                message: this.callerIdNumber,
                contextMessage: this.callerIdName,
                requireInteraction: true,
                buttons: [
                    {
                        title: "Hangup",
                        iconUrl: "./images/error64.png"
                    }
                ]
            }, (id) => {
                console.log(id);
                this.notificationId = id;
            });
        } else {
            // if (!Helper.getWindowById('vertoPhone'))
            //     Helper.createVertoWindow();
        }
    }

    showMissed () {
        if  (Helper.session && Helper.session.notificationMissed()) {
            const number = this.callerIdNumber;
            Helper.createNotification({
                type: 'basic',
                iconUrl: './images/exclamation64.png',
                title: "Missed call!",
                message: number,
                contextMessage: this.callerIdName + '(' + new Date().toLocaleString() + ')',
                requireInteraction: true,
                buttons: [
                    {
                        title: "Reply",
                        iconUrl: "./images/call64.png"
                    },
                    {
                        title: "OK",
                        iconUrl: "./images/success64.png"
                    }
                ]
            }, (id) => {
                console.log(id);
                Helper.missedNotifications[id] = {
                    number: number
                }
            });
        }
    }
}


const PROTECTED_WEBITEL_DATA = ["dlr_member_id", "dlr_id", "domain_name"];