/**
 * Created by igor on 19.09.16.
 */

"use strict";

const markedRenderer = window.a = new marked.Renderer();
markedRenderer.link = function(href, title, text) {
    return `<a href="#" title="'${title || ''}'" onclick="window.require('nw.gui').Shell.openExternal('${href}')" >${text}</a>`
};

angular
    .module('app.call', ['app.callService', 'app.directive'])
    .controller('callCtrl', function ($scope, CallService, $rootScope, $timeout, $sce) {

        var onKeyUp = $rootScope.$on('key:down', function (e, key) {
            if (key.target.nodeName === "INPUT" || key.target.nodeName === "TEXTAREA") return;
            var myKey = true;

            if (key.keyCode === 77) {
                toggleMute(getActiveCallId());
            } else if (key.keyCode === 72) {
                toggleHold(getActiveCallId());
            } else if (between(key.keyCode, 48, 57) || between(key.keyCode, 96, 105)) {
                dtmf(key.key)
            } else if (key.keyCode === 13 || key.keyCode === 65 ) {
                answerCall(getActiveCallId())
            } else if (key.keyCode === 81) {
                dropCall(getActiveCallId())
            } else {
                myKey = false;
            }

            if (myKey) {
                key.preventDefault();
                $scope.$apply();
            }
        });

        $scope.$on('$destroy', function () {
            onKeyUp();
        });
        
        function getActiveCallId() {
            return $rootScope.activeCall && $rootScope.activeCall.id;
        };

        $scope.openVideo = function (call) {
            CallService.openVideo(call.id);
        };

        $scope.bridge = function (legA, legB) {
            CallService.bridgeChannel(legA, legB);
        };

        $scope.screenShare = screenShare;
        $scope.dropCall = dropCall;
        $scope.answerCall = answerCall;
        $scope.holdCall = holdCall;
        $scope.unholdCall = unholdCall;
        $scope.toggleHold = toggleHold;
        $scope.toggleMute = toggleMute;
        $scope.transfer = transfer;
        $scope.openMenu = openMenu;
        $scope.dtmf = dtmf;
        $scope.getDisplay = getDisplay;
        $scope.copyNumber = copyNumber;
        $scope.getMark = getMark;
        $scope.savePostProcess = savePostProcess;

        $scope.setVote = function (id, vote, call) {
            CallService.setVote(id, vote);
            //TODO
            call.vote = vote;
            $timeout(() => $scope.$apply(), 0);
        };

        $scope.$watch("activeCall.privateVariables.dlrSuccess", function (val) {
            CallService.setVar($scope.activeCall.id, 'dlrSuccess', val)
        });

        $scope.$watch("activeCall.privateVariables.dlrAfterMin", function (val) {
            CallService.setVar($scope.activeCall.id, 'dlrAfterMin', val)
        });
        $scope.$watch("activeCall.privateVariables.dlrDoNotCallThisNumber", function (val) {
            CallService.setVar($scope.activeCall.id, 'dlrDoNotCallThisNumber', val)
        });
        $scope.$watch("activeCall.privateVariables.dlrAddNewNumber", function (val) {
            CallService.setVar($scope.activeCall.id, 'dlrAddNewNumber', val)
        });

        $scope.setComment = function (id, comment) {
            CallService.setComment(id, comment);
        };

        $scope.setTags = function (id, tags) {
            CallService.setTags(id, tags);
        };

        function getDisplay(call) {
            //activeCall.contact.name ? activeCall.contact.name  + ' (' + activeCall.calleeIdNumber + ')': activeCall.calleeIdNumber
            let res = '';
            if (!call)
                return res;
            
            if (call.contact && call.contact.name) {
                res = `${call.contact.name} (${call.calleeIdNumber})`;
            } else {
                res = `${call.calleeIdNumber}`;
            }
            if (call.dtmfArray.length > 0) {
                res += `;${call.dtmfArray.join('')}`;
            }
            return res;
        }

        function copyNumber(text) {
            const input = document.createElement('input');
            input.style.position = 'fixed';
            input.style.opacity = 0;
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand('Copy');
            document.body.removeChild(input);
        }

        $scope.openMe = function (el) {
            console.log(el);
        };

        function getMark(val) {
            try {
                return $sce.trustAsHtml(`${marked(val, {renderer: markedRenderer})}`);
            } catch (e) {
                return val;
            }
        }

        function savePostProcess(call) {
            CallService.savePostProcess(call)
        }

        function screenShare(id) {
            CallService.screenShare(id, {});
        }
        function answerCall(id, useVideo) {
            CallService.answerCall(id, {
                useVideo: useVideo
            });
        }

        function holdCall(id) {
            CallService.holdCall(id);
        }

        function unholdCall(id) {
            CallService.unholdCall(id);
        }

        function toggleHold(id) {
            CallService.toggleHold(id);
        }

        function toggleMute(id) {
            CallService.toggleMute(id);
        }

        function transfer(id, dest) {
            CallService.transfer(id, dest);
        }

        function openMenu(id, name) {
            CallService.openMenu(id, name);
        }

        function dtmf(d) {
            if ($scope.activeCall)
                CallService.dtmf($scope.activeCall.id, d);
        }

        function dropCall(id) {
            CallService.dropCall(id);
        }

        function between(x, min, max) {
            return x >= min && x <= max;
        }
    })
    .directive('uiVideoCall', function (CallService) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {
                callId: "=",
                videoOn: "="
            },
            template: '<video volume="0" id="{{callId}}"></video>',
            link: function (scope, el) {
                var $video = el[0];
                scope.$watch('videoOn', function (video) {
                    if (video) {
                        var stream = CallService.getCallStream(scope.callId);
                        if (stream) {
                            $video.srcObject = stream.remoteStream;
                            $video.volume = 0;
                            $video.play()
                        }
                    }
                });
            }
        }
    })

;