/**
 * Created by igor on 19.09.16.
 */

"use strict";
    
angular
    .module('app.callService', [])
    .service('CallService', function ($window, $rootScope) {
    return {
        makeCall: function (number, params) {
            $rootScope.session.makeCall(number, params);
        },
        bridgeChannel: function (legA, legB) {
            $window.vertoSession.bridgeChannel(legA, legB);
        },
        screenShare: function (id, params) {
            $window.vertoSession.screenShare(id, params);
        },

        dropCall: function (id) {
            $window.vertoSession.dropCall(id);
        },

        answerCall: function (id, params) {
            $window.vertoSession.answerCall(id, params);
        },

        setVote: function (id, vote) {
            $window.vertoSession.setVote(id, vote);
        },

        setViewCall: function (id, view) {
            $window.vertoSession.setViewCall(id, view);
        },

        setComment: function (id, comment) {
            $window.vertoSession.setComment(id, comment);
        },

        setVar: function (id, varName, varVal) {
            $window.vertoSession.setVar(id, varName, varVal);
        },

        setTags: function (id, tags) {
            $window.vertoSession.setTags(id, tags);
        },

        getCallStream: function (id) {
            return $window.vertoSession.getCallStream(id);
        },        

        holdCall: function (id) {
            $window.vertoSession.holdCall(id);
        },

        unholdCall: function (id) {
            $window.vertoSession.unholdCall(id);
        },

        toggleHold: function (id) {
            $window.vertoSession.toggleHold(id);
        },

        toggleMute: function (id) {
            $window.vertoSession.toggleMute(id);
        },

        dtmf: function (id, d) {
            $window.vertoSession.dtmf(id, d);
        },

        transfer: function (id, dest) {
            if (!dest) {
                return false;
            }

            $window.vertoSession.transfer(id, dest);
        },

        openVideo: function (id) {
            $window.vertoSession.openVideo(id);
        },

        openMenu: function (id, name) {
            $window.vertoSession.openMenu(id, name);
        },

        getLastCallNumber: function (id, key) {
            return $window.vertoSession.getLastCallNumber();
        },

        eavesdropCall: function (number, otherNum, userId, uuid) {
            $window.vertoSession.request("POST", `/api/v2/channels/${uuid}/eavesdrop?side=` + number, JSON.stringify({
                "display": number,
                "user": userId,
                "variables": ["webitel_data=" + JSON.stringify({"eavesdrop": true, "otherNumber": otherNum}) + "", "eavesdrop_whisper_bleg=true"]
            }), (err) => {
                if (err)
                    console.error(err);
            });
        },
        
        getUserChannels: function (userId, cb) {
            $window.vertoSession.request("GET", `/api/v2/channels/${userId}`, null, cb);
        },

        getMyId: function () {
            return $window.vertoSession.webitelUser.id
        },

        savePostProcess: function (call) {
            $window.vertoSession.savePostProcess(call)
        }
    }
});