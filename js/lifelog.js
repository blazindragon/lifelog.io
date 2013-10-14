// lots of knowledge taken from https://github.com/crabasa/votr-part4

var app = angular.module('lifelog', ['ngResource']);

app.config(function($routeProvider) {
    $routeProvider.
    when('/', {templateUrl:'entry_list.html'}).
    when('/signin', {controller:'AuthCtrl', templateUrl:'signin.html'}).
    when('/signout', {controller:'AuthCtrl', templateUrl:'signout.html'}).
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
    return $resource('/api/session')
});

app.controller('AuthCtrl', function($scope, $rootScope, $location, AuthService) {
    $scope.user = {
        username: '',
        password: ''
    };

    $scope.login = function() {
        $scope.user = AuthService.save($scope.user, function(success) {
            $rootScope.loggedIn = true;
            $location.path('/');
        }, function(error) {
            $scope.errorMessage = error.data.error_message;
            $scope.signinError = true;
        });
    };

    $scope.logout = function() {
        $scope.user = AuthService.delete($scope.user, function(success) {
            $rootScope.loggedIn = false;
        }, function(error) {
            $scope.signoutError = true;
            $scope.errorMessage = error.data.error_message;
        });
    }
});

app.factory('AccountService', function($resource) {
    return $resource('/api/signup')
});

app.controller('SignupCtrl', function($scope, $rootScope, $location, AccountService) {
    $scope.user = {
        username: '',
        email: '',
        password: ''
    };

    $scope.signup = function() {
        $scope.user = AccountService.save($scope.user, function(success) {
            $location.path('/signin')
        }, function(error) {
            $scope.signupError = true;
            $scope.errorMessage = error.data.error_message;
        });
    };
});
