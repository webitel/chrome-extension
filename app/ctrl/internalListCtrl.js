/**
 * Created by igor on 20.07.17.
 */


"use strict";

angular
    .module('app.internal', [])
    .controller('internalCtrl', function ($scope, CallService, $timeout, $rootScope) {

        $scope.data = [];

        function getAgentById(id) {
            for (let agent of $scope.data)
                if (agent.id === id)
                    return agent;
        }

        $scope.makeCall = (number) => {
            CallService.makeCall(number);
        };

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

        const fnOnUserStatusChange = (e) => {
            const a = getAgentById(e.id);
            if (a) {
                a.tag = e.tag; // /
                a.away = e.away;
                a.state = e.state;
                a.channels = null;
                a.showDetail = false;
                a.stateName = getStateName(e.state, e.away);
                $timeout(function () {
                    $scope.$apply();
                });

                // if (a.state)
            }
        };

        const eventId = vertoSession.webitel.onUserStatusChange(fnOnUserStatusChange);
        const unSubscribeGridEvents = () => {
            vertoSession.webitel.unUserStatusChange(eventId)
        };

        $scope.$on('$destroy', () => {
            unSubscribeGridEvents();
        });

        vertoSession.webitel.getAgentsList( list => $scope.data = list.map((agent) => {
            agent.stateName = getStateName(agent.state, agent.away);
            agent.orderBy = parseInt(agent.id) || agent.id;
            return agent;
        }));

        $scope.showDetail = (record) => {
            CallService.getUserChannels(record.id, (err, res) => {
                if (err)
                    return console.error(err);
                
                record.channels = (res.data || []).map(i => {
                    return {
                        dest: i.cid_num === record.id ? i.callee_num || i.dest : i.cid_num,
                        uuid: i.uuid
                    }
                });
                $timeout(function () {
                    $scope.$apply();
                });
            });
            record.showDetail = !record.showDetail;
        };

        $scope.myId = getMyId();

        $scope.eavesdropCall = (number, otherNum, userId, uuid) => {
            CallService.eavesdropCall(number, otherNum, userId, uuid)
        };

        function getMyId() {
            return CallService.getMyId()
        }
    });