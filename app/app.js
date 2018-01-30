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
    $rootScope.currentViewTemplate = 'init';// Helper.getView();
    $rootScope.session = Helper.getSession();
    $rootScope.isActiveChangeStatus = false;
    $rootScope.activeCalls = Helper.getActiveCalls();
    $rootScope.activeCall = null;

//    angular.forEach(Helper.session.activeCalls, i => $rootScope.activeCalls.push(i));

    function setCurrentViewTemplate(view) {
        $rootScope.currentViewTemplate = view;
        Helper.setView(view);
    }

    $rootScope.showChangeStatusPage = () => $rootScope.isActiveChangeStatus = true;

    $rootScope._theme = localStorage.getItem("theme") || "dark";
    localStorage.setItem("theme", $rootScope._theme);

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

    $rootScope.search = '';
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

    $rootScope.loggedIn = !!Helper.getSession();
    $rootScope.serverEngine = localStorage.getItem('serverEngine');
    $rootScope.iceServers = localStorage.getItem('iceServers');

    function setLoginPage() {
        document.title = "Login";
        $rootScope.serverEngine = localStorage.getItem('serverEngine');
        $rootScope.iceServers = localStorage.getItem('iceServers');

        $rootScope.isLoged = false;
        $rootScope.changeState('login', false);
        $rootScope.$apply();
    }

    $rootScope.login = function (login, password, serverEngine, iceServers) {
        $rootScope.sendBg('login', {
            login,
            password,
            serverEngine,
            iceServers
        });
        changeState('init', false)
    };

    $rootScope.$on('bg:onMyStatusChange', function (e, data) {
        console.debug(data);
        $rootScope.webitelUser = data;
        $rootScope.$apply();
    });

    $rootScope.$on('bg:unauthorized', function (e, data) {
        setLoginPage()
    });

    $rootScope.$on('bg:logout', () => {
        setLoginPage()
    });

    $rootScope.$on('bg:onNewOutboundCall', () => {
        $rootScope.search = '';
    });

    $rootScope.$on('bg:init', function (e, data) {
        console.warn(data);
        if (data.tabName) {
            setLoginPage()
        }
    });
    $rootScope.$on('bg:changeCall', function (e, data) {
        console.log(data);
        setActiveCall(data);
    });
    
    $rootScope.setViewCall = function (call) {
        //$rootScope.activeCall = call;

        //
        call.isView = true;
        // CallService.setViewCall(call.id, true);
        angular.forEach($rootScope.activeCalls, c => {
            CallService.setViewCall(c.id, c.id === call.id);
        });

        //

        //

        if (call.state === 'held') {
            CallService.unholdCall(call.id)
        } else if (call.state === 'newCall') {
            if ($rootScope.activeCall && $rootScope.activeCall.state === 'active') {
                CallService.holdCall($rootScope.activeCall.id);
            }
        }
        $rootScope.activeCall = call;
        setCallView();

    };

    function setCallView() {
        setCurrentViewTemplate('app/view/call.html');
    }

    function setActiveCall(data) {
        $rootScope.activeCalls = [];
        $rootScope.activeCall = null;

        for (var key in data) {
            var call = data[key];
            $rootScope.activeCalls.push(call);
            if (call.isView) {
               $rootScope.activeCall = call;
            }
        }

        if (!$rootScope.activeCall && $rootScope.activeCalls.length > 0) {
            $rootScope.activeCall = $rootScope.activeCalls[0]
        }

        if ($rootScope.activeCalls.length > 0) {
            setCallView()
        } else {
            changeState($rootScope.activeTabName !== 'call' && $rootScope.activeTabName !== 'settings'
                ? $rootScope.activeTabName
                : 'history');
        }
        $timeout(() => {
            $rootScope.$apply()
        })
    }

    $rootScope.activeTabName = 'login';

    if (!$rootScope.inCall)
        changeState($rootScope.activeTabName);

    $rootScope.changeState = changeState;

    function changeState(stateName, isPage, data) {
        if (!$rootScope.isLoged && stateName !== 'init') {
            stateName = 'login';
        }

        var newTemplate = stateName;
        
        $rootScope._prevActiveTabName = $rootScope.activeTabName;
        $rootScope.activeTabName = stateName;
        if (isPage) {
            newTemplate += 'Page'
        }
        $rootScope.currentViewData = data;
        setCurrentViewTemplate('app/view/' + newTemplate + '.html');

    };

    $window.onkeydown = function (e) {
        $rootScope.$emit('key:down', e);
        return e.stopPropagation()
    };

    function init(e, data) {
        window.vertoSession = Helper.session;
        $rootScope.session = Helper.session;
        if (data.success) {
            document.title = data.name;
            $rootScope.webitelUser = Helper.session.webitelUser;
            $rootScope.useVideo = Helper.session.useVideo;
            $rootScope.isLoged = true;
            $rootScope.changeState('history', false);
        } else {
            //todo notification
            setLoginPage()
        }
    }

    if (Helper.session) {
        init(null, {success: true})
    }

    $rootScope.$on('bg:onWSLogin', init);
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