var bg = angular.module('app.chrome', []);
bg.run(function ($rootScope) {
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log('bg:' + request.action);
            $rootScope.$emit('bg:' + request.action, request.data)
        }
    );
    
    $rootScope.sendBg = function (action, data) {
        console.log('snd:' + action);
        chrome.runtime.sendMessage({
            action: action,
            data: data
        });
    }
});

var vertoPhone = angular.module("vertoPhone", ['app.callService', 'app.contacts', 'app.history', 'app.favorites',
    'app.settings', 'app.chrome', 'app.dialpad', 'app.call', 'app.internal', 'app.cdrService', 'app.control-status',
    'ngSanitize']);

var Helper = chrome.extension.getBackgroundPage().Helper;

window.vertoSession = Helper.session;

vertoPhone.constant('Tabs', {
    history: {
        name: 'History',
        class: 'icon ion-ios-clock-outline'
    },
    internal: {
        name: 'Users',
        class: 'icon icon-person'
    },
    settings: {
        name: 'Settings',
        class: 'icon icon-gear'
    }
});

vertoPhone.run(function($rootScope, $window, CallService, $timeout) {
    $rootScope.currentViewTemplate = "";
    $rootScope.session = Helper.getSession();
    $rootScope.isActiveChangeStatus = false;
    $rootScope.activeCalls = Helper.getActiveCalls();
    $rootScope.activeCall = Helper.getActiveCall();
    $rootScope.search = '';

    updateState(Helper.state);

    $rootScope.$on('bg:state', (e, state) => {
        updateState(state)
    });

    $rootScope.$on('bg:onMyStatusChange', function (e, data) {
        console.debug(data);
        $rootScope.webitelUser = data;
        $rootScope.$apply();
    });

    $rootScope.$on('bg:onNewOutboundCall', () => {
        $rootScope.search = '';
    });

    $rootScope.makeCall = function (number) {
        if (!number)
            return;


        CallService.makeCall(number);
    };

    $rootScope.closeError = function (err) {
        var pos = $rootScope.errors.indexOf(err);
        if (~pos) {
            $rootScope.errors.splice(pos, 1)
        }
    };

    $rootScope.showChangeStatusPage = () => $rootScope.isActiveChangeStatus = true;

    $rootScope._theme = localStorage.getItem("theme") || "dark";
    localStorage.setItem("theme", $rootScope._theme);

    $rootScope.changeState = (view, isPage, data) => {
        Helper.setView(view, isPage, data);
    };

    function updateState(state = {}) {
        $rootScope.currentViewTemplate = state.currentViewTemplate;
        $rootScope.activeTabName = state.activeTabName;
        $rootScope.isLoged = $rootScope.loggedIn = !!Helper.getSession();
        $rootScope.serverEngine = localStorage.getItem('serverEngine');
        $rootScope.search = state.search || "";

        if (Helper.session) {
            window.vertoSession = Helper.session;
            $rootScope.session = Helper.session;
            document.title = $rootScope.webitelUser = Helper.session.webitelUser;
        } else {
            //TODO
        }

        $rootScope.$apply();
    }

    $rootScope.$watch('search', v => {
        Helper.setSearch(v);
    });


    $rootScope.login = function (login, password, serverEngine, iceServers) {
        $rootScope.sendBg('login', {
            login,
            password,
            serverEngine,
            iceServers
        });
    };

    $window.onkeydown = function (e) {
        $rootScope.$emit('key:down', e);
        return e.stopPropagation()
    };

    $rootScope.$on('bg:changeCall', function (e, data) {
        $rootScope.activeCall = Helper.getActiveCall();
        $rootScope.activeCalls = Helper.getActiveCalls();
        $rootScope.$apply();
    });

    $rootScope.setViewCall = function (call) {
        CallService.setViewCall(call.id, true);
    };

    $rootScope.errors = [];
    $rootScope.addError = function (msg, time) {
        var err = new Error(msg);
        $rootScope.errors.push(err);
        if (time) {
            $timeout(function() {
                $rootScope.closeError(err);
            }, time)
        }
    };

    return;
});

vertoPhone.directive('uiToggle', function () {
    return {
        restrict: "AE",
        replace: true,
        scope: {
            ngModel: '='
        },
        template: `
            <div class="toggle" ng-class="{'active': ngModel}" ng-click="changeToggle()">
				<div class="toggle-handle"></div>
				<input type="checkbox" style="display: none;" ng-model="ngModel">
			</div>
        `,
        link: function (scope, el) {

            scope.changeToggle = function () {
                scope.ngModel = !scope.ngModel;
            }
        }
    }
});

vertoPhone.controller('navigate', ['$rootScope', '$scope', 'Tabs', function ($rootScope, $scope, Tabs) {
    $scope.tabs = Tabs;
}]);