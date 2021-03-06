/**
 * Created by igor on 19.09.16.
 */

"use strict";
    
angular
    .module('app.settings', [])
    .controller('settingsCtrl', ['$scope', '$rootScope', function ($scope, $rootScope) {

        try {
            $scope.interface = JSON.parse(localStorage.getItem('interface'));
        } catch (e) {

        }

        if (!$scope.interface) {
            $scope.interface = {
                ring: true,
                alwaysOnTop: true
            };
        }

        $scope.$watch('interface', function (val) {
            if (val) {
                localStorage.setItem('interface', JSON.stringify(val));

                if (window.vertoSession) {
                    window.vertoSession.reloadSettings();
                }
            }
        }, true);

        $scope.logout = () => {
            Helper.logout();
        };

        $scope.theme = localStorage.getItem("theme") || "";

        $scope.$watch("theme", function (val) {
            localStorage.setItem("theme", val || "");
            $rootScope._theme = val || "";
        });

        $scope.themes = [
            {
                name: "Dark",
                class: 'dark'
            },
            {
                name: "Light",
                class: "light"
            }
        ];
    }]);
