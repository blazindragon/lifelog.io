// lots of knowledge taken from https://github.com/crabasa/votr-part4

var app = angular.module('lifelog', ['ngResource']);

app.config(function($routeProvider) {
    $routeProvider.
    when('/', {controller:'EntryCtrl', templateUrl:'main.html'}).
    when('/signin', {controller:'AuthCtrl', templateUrl:'signin.html'}).
    when('/signout', {controller:'AuthCtrl', templateUrl:'signout.html'}).
    when('/signup', {controller:'SignupCtrl', templateUrl:'signup.html'}).
    when('/edit_profile', {controller:'AccountCtrl', templateUrl:'edit_profile.html'}).
    when('/change_password', {controller:'PasswordCtrl', templateUrl:'change_password.html'}).
    otherwise({redirectTo:'/'});
});

app.factory('EntryService', function($resource) {
    return $resource('/api/entry/:id', {}, {
        query: {method:'GET', params:{id:''}, isArray:true},
        save: {method:'POST'},
        remove: {method:'DELETE'},
        update: {method:'PUT', params:{id:'@id'}}
    });
});

app.controller('EntryCtrl', function($scope, EntryService) {
    $scope.entries = {};

    $scope.load = function($resource) {
        var raw_entries = EntryService.get();
        for(var i = 0; i < raw_entries.length; i++) {

        }
    };
});

app.factory('AuthService', function($resource) {
    return $resource('/api/session')
});

app.controller('AuthCtrl', function($scope, $rootScope, $location, AuthService) {
    $rootScope.user = {
        username: '',
        password: ''
    };

    $scope.login = function() {
        $rootScope.user = AuthService.save($scope.user, function(success) {
            $rootScope.loggedIn = true;
            $location.path('/');
        }, function(error) {
            console.log(error)
            $scope.errorMessage = error.data.error_message;
            $scope.signinError = true;
        });
    };

    $scope.logout = function() {
        $rootScope.user = AuthService.delete($scope.user, function(success) {
            $rootScope.loggedIn = false;
        }, function(error) {
            $scope.signoutError = true;
            $scope.errorMessage = error.data.error_message;
        });
    }
});

app.factory('AccountService', function($resource) {
    return $resource('/api/user');
});

app.controller('AccountCtrl', function($scope, AccountService) {
    $scope.user = {
        username: '',
        email: ''
    };

    $scope.load = function() {
        $scope.user = AccountService.get($scope.user, function(success) {
             // do nothing
        }, function(error) {
            $scope.updateError = true;
            $scope.errorMessage = error.data.error_message;
        });
    };

    $scope.save = function() {
        $scope.user = AccountService.save($scope.user, function(success) {
            $scope.updateSuccessful = true;
            $scope.updateError = false;
        }, function(error) {
            $scope.updateSuccessful = false;
            $scope.updateError = true;
            $scope.errorMessage = error.data.error_message;
        });
    };
});

app.factory('PasswordService', function($resource) {
    return $resource('/api/change_password');
});

app.controller('PasswordCtrl', function($scope, PasswordService) {
    $scope.password = {
        old_password: '',
        new_password: ''
    };

    $scope.save = function() {
        PasswordService.save($scope.password, function(success) {
            $scope.updateSuccessful = true;
            $scope.updateError = false;
        }, function(error) {
            $scope.updateSuccessful = false;
            $scope.updateError = true;
            $scope.errorMessage = error.data.error_message;
        });
    };
});

app.factory('SignupService', function($resource) {
    return $resource('/api/signup');
});

app.controller('SignupCtrl', function($scope, $location, SignupService) {
    $scope.user = {
        username: '',
        email: '',
        password: ''
    };

    $scope.signup = function() {
        $scope.user = SignupService.save($scope.user, function(success) {
            $location.path('/signin')
        }, function(error) {
            $scope.signupError = true;
            $scope.errorMessage = error.data.error_message;
        });
    };
});
