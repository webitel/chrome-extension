/**
 * Created by igor on 22.07.17.
 */


"use strict";

angular
    .module('app.cdrService', [])
    .service('CDRService', function ($window, $rootScope) {
        return $rootScope.session.getService('cdr');
    });