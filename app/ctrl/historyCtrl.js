/**
 * Created by igor on 20.09.16.
 */

"use strict";

angular
    .module('app.history', ['app.callService'])
    .controller('historyCtrl', ['$scope', '$rootScope', 'CallService', 'CDRService', '$timeout', '$sce',
        function ($scope, $rootScope, CallService, CDRService, $timeout, $sce) {
        $scope.group = [];

        $scope.toggleShowGroup = function (g) {
            g.show = !g.show;
        };

        $scope.trustSrc = function(src) {
            return $sce.trustAsResourceUrl(src);
        };

        $scope.showDetail = function (record) {
            record.showDetail = !record.showDetail;
        };

        $scope.totalCount = 0;
        $scope.showCount = 0;

        function onData(e, data, totalCount, count) {
            if (e)
                return;

            $scope.totalCount = totalCount;
            $scope.showCount = count;

            $scope.nextData = totalCount === count;
            $scope.group = data;
            $timeout(function () {
                $scope.$apply();
            }, 0);
        }

        $scope.reloadData = function () {
            CDRService.find($rootScope.search, onData, true);
        };


        let timeout = null;

        $scope.$watch('search', function (val, oldVal) {
            if (val === oldVal && $scope.group.length === 0) {
                CDRService.find(val, onData);
                return;
            }

            if (timeout !== null) {
                clearTimeout(timeout);
            }

            setTimeout(() => {
                CDRService.find(val, onData);
            }, 500);
        });

        $scope.openJson = function (uuid) {
            CDRService.byUuid(uuid, (err, res) => {
                if (err || !res || !res[0]) {
                    return; //TODO
                }

                var textFileAsBlob = new Blob([JSON.stringify(res[0])], {type: 'application/json'}),
                    downloadLink = document.createElement("a");

                downloadLink.download = uuid + ".json";
                downloadLink.innerHTML = "Download File";

                if (window.webkitURL !== null) {
                    downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
                }
                else {
                    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                    downloadLink.style.display = "none";
                    document.body.appendChild(downloadLink);
                }
                downloadLink.click();
            })
        };
        
        $scope.nextPage = function () {
            CDRService.next(onData)
        };

        $scope.nextData = false;

        $scope.getRecordingsClass =  (rec) => {
            switch (rec['content-type']) {
                case 'application/pdf':
                    return 'application-pdf-file';
                case 'audio/wav':
                    return 'audio-wav-file';

                case 'audio/mpeg':
                default:
                    return 'audio-mp3-file'
            }
        };

        $scope.makeCall = function (number) {
            CallService.makeCall(number)
        };
        
        $scope.getTime = function (time) {
            return new Date(time).toLocaleString()
        }
    }]);