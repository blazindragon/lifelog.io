// lots of knowledge taken from https://github.com/crabasa/votr-part4

var app = angular.module('lifelog', ['ngResource']);

app.config(function($routeProvider) {
    $routeProvider.
    when('/', {controller:'EventListCtrl', templateUrl:'entry_list.html'}).
    when('/signin', {controller:'SigninCtrl', templateUrl:'signin.html'}).
    when('/signout', {controller:'SignoutCtrl', templateUrl:'signout.html'}).
    when('/signup', {controller:'SignupCtrl', templateUrl:'signup.html'}).
    otherwise({redirectTo:'/'});
});

app.config(function($httpProvider) {
    $httpProvider.interceptors.push(function($rootScope, $location, $q) {
        return {
            'responseError': function(rejection) {
                // if we're not logged-in to the web service, redirect to login page
                if (rejection.status === 401 && $location.path() != '/signin') {
                    $rootScope.loggedIn = false;
                    $location.path('/login');
                }

                return $q.reject(rejection);
            }
        };
    });
});

app.factory('AuthService', function($resource) {
    return $resource('//api.lifelog.io/session')
});

app.controller('SigninCtrl', function($scope, $rootScope, $location, AuthService) {
    $scope.user = {username:'', password:''};

    $scope.login = function() {
        $scope.user = AuthService.save($scope.user, function(success) {
            $rootScope.logged_in = true;
            $location.path('/');
        }, function(error) {
            $scope.loginError = true;
        });
    };
});

