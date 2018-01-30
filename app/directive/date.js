/**
 * Created by igor on 10.10.16.
 */

"use strict";

angular
    .module('app.directive', [])
    .directive('uiTimer', function () {
        function checkTime(i) {
            if (i < 10) {
                i = "0" + i;
            }
            return i;
        }

        return {
            restrict: 'A',
            scope: {start: "=start", stop:"=stop"},
            link: function(scope, ele) {
                var startTimer, timer;
                
                scope.$watch("start", function (val) {
                    clearTimeout(timer);
                    timer = startTimer();
                });

                scope.$watch("stop", function (val) {
                    clearTimeout(timer);
                    timer = startTimer();
                });

                startTimer = function() {
                    if (scope.$$destroyed)
                        return;
                    var m, s, time;

                    if (!scope.start) {
                        ele.html("00:00");
                        if (scope.stop)
                            return;
                        timer = setTimeout(startTimer, 500);
                        return timer;
                    }
                    s = Math.floor(((scope.stop || Date.now()) - scope.start) / 1000);
                    m = Math.floor(s / 60);
                    m = checkTime(m);
                    s = checkTime(s % 60);
                    time = m + ":" + s;
                    ele.html(time);
                    if (scope.stop)
                        return;
                    timer = setTimeout(startTimer, 500);
                    return timer;
                };

                timer = startTimer();
            }

        }
    });

