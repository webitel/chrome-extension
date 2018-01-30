/**
 * Created by igor on 20.09.16.
 */

"use strict";

angular
    .module('app.control-status', [])
    .controller('changeStatus', ['$scope', '$rootScope', function ($scope, $rootScope) {
        $scope.tab = 'user';
        $scope.close = () => $rootScope.isActiveChangeStatus = false;
        $scope.changeTab = tabName => $scope.tab = tabName;

        $scope.status = null;
        $scope.state = null;
        $scope.tag = null;

        function setAgentState(agentId, domainName, state, cb) {
            if (!agentId || !domainName || !state)
                return cb(new Error("Bad agent id, state or domain"));

            vertoSession.request("POST", '/api/v2/callcenter/agent/' + agentId + '/state?domain=' + domainName, JSON.stringify({state: state}), cb);
        }

        function setAgentStatus(agentId, domainName, status, cb) {
            if (!agentId || !domainName || !status)
                return cb(new Error("Bad agent id, status or domain"));

            console.log(`${agentId} = ${status}`);
            vertoSession.request("POST", '/api/v2/callcenter/agent/' + agentId + '/status?domain=' + domainName, JSON.stringify({status: status}), cb);
        }
        
        function getDefAgentStatus() {
            return vertoSession.onDemand ? 'Available (On Demand)' : 'Available'
        }

        $scope.setNewState = (status, state, descript) => {
            const st = $scope.getStatuses(status);
            const user = vertoSession.webitelUser;
            if (!st) {
                //todo error
                return;
            }

            st.setState(state, descript);

            $rootScope.isActiveChangeStatus = false;
        };

        $scope.$watch('isActiveChangeStatus', (v, old) => {
            if (v) {
                if (!vertoSession.webitelUser.agent) {
                    $scope.userStatus = [
                        statusUserReady,
                        statusUserBusy
                    ];
                } else {
                    $scope.userStatus = [
                        statusUserReady,
                        statusAgent,
                        statusUserBusy
                    ];
                }
                if (vertoSession.webitelUser.inCC) {
                    $scope.status = 'AGENT';
                    if (vertoSession.webitelUser.tag) {
                        $scope.state = vertoSession.webitelUser.tag;
                    } else if (vertoSession.webitelUser.away === "NONE") {
                        $scope.state = 'Waiting';
                    }
                    $scope.descript = '';
                } else {
                    $scope.status = vertoSession.webitelUser.state;
                    $scope.state = vertoSession.webitelUser.away;
                    $scope.descript = vertoSession.webitelUser.tag;
                }
            }
        });

        $scope.getStatuses = status => {
            switch (status) {
                case 'AGENT':
                    return statusAgent;
                case 'ISBUSY':
                    return statusUserBusy;
                case 'ONHOOK':
                    return statusUserReady;
                default:
                    return null;
            }
        };

        const statusAgent =  {
            id: "AGENT",
            label: "Call Center",
            descript: false,
            disabled: () => {
                return vertoSession.webitelUser.agent
            },
            setState: (state) => {
                function exec() {
                    if (state === "Waiting") {
                        setAgentStatus(vertoSession.webitelUser.id, vertoSession.webitelUser.domain, getDefAgentStatus(), () => {

                        })
                    } else {
                        setAgentStatus(vertoSession.webitelUser.id, vertoSession.webitelUser.domain, "On Break", () => {

                        })
                    }
                }

                if (vertoSession.webitelUser.away !== "AGENT") {
                    vertoSession.webitel.ready(exec)
                } else {
                    exec()
                }


            },
            states: [
                {
                    id: "On Break",
                    label: "On break",
                },
                {
                    id: "Waiting",
                    label: "Waiting"
                }
            ]
        };

        const statusUserBusy = {
            id: "ISBUSY",
            label: "Busy",
            descript: true,
            setState: (state, desc) => {
                if (vertoSession.webitelUser.inCC) {
                    setAgentStatus(vertoSession.webitelUser.id, vertoSession.webitelUser.domain, "Logged Out", () => {
                        vertoSession.webitel.busy(state, desc, res => {

                        })
                    })
                } else {
                    vertoSession.webitel.busy(state, desc, res => {

                    })
                }

            },
            states: [
                {
                    id: "DND",
                    label: "Do not disturb",
                },
                {
                    id: "ONBREAK",
                    label: "On break",
                },
                {
                    id: "CALLFORWARD",
                    label: "Call forward",
                }
            ]
        };

        const statusUserReady = {
            id: "ONHOOK",
            label: "Ready",
            descript: false,
            setState: (state, desc) => {
                if (vertoSession.webitelUser.inCC) {
                    setAgentStatus(vertoSession.webitelUser.id, vertoSession.webitelUser.domain, "Logged Out", () => {
                        vertoSession.webitel.ready( res => {

                        })
                    })
                } else {
                    vertoSession.webitel.ready( res => {

                    })
                }
            },
            states: []
        };

        $scope.userStatus = [
            statusUserReady,
            statusAgent,
            statusUserBusy
        ];
    }]);