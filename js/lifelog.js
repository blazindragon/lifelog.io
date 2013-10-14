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

app.filter('splitTags', function() {
    return function(input) {
        if(!input) {
            return;
        }

        var nohash = input.slice(1);
        var elements = nohash.split('/');

        if(!elements || elements.length == 0) {
            return;
        }

        var rendered = '#';
        var prefix = '';
        for(var i = 0; i < elements.length; i++) {
            if(i > 0) {
                rendered += '/';
            }

            prefix += elements[i];
            rendered += '<a href="#/tag/' + prefix + '">' + elements[i] + '</a>';
            prefix += '/';
        }

        return rendered;
    }
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
    var dateFormat = 'dddd, MMMM D, YYYY';
    $scope.entriesByDay = {};

    $scope.load = function($resource) {
        var today = moment().format(dateFormat);
        $scope.entriesByDay[today] = [];

        var raw = EntryService.query({}, function(success) {
            for(var i = 0; i < raw.length; i++) {
                var date = moment(raw[i].timestamp).format(dateFormat);

                if(!(date in $scope.entriesByDay)) {
                    $scope.entriesByDay[date] = [];
                }

                $scope.entriesByDay[date].push(raw[i]);
            }
        }, function(error) {
            // TODO(fsareshwala): fill me in
        });
    };

    $scope.addEntry = function($resource) {
        if(!this.content) {
            return;
        }

        var day = this.day;
        var content = this.content;
        this.content = '';

        var entry = {
            content: content,
            timestamp: moment.utc(day, dateFormat)
        };

        var response = EntryService.save(entry, function(success) {
            $scope.entriesByDay[day].push(response);
        }, function(error) {
            // TODO(fsareshwala): fill me in
        });
    };

    $scope.deleteEntry = function($resource) {
        var day = this.day;
        var entryId = this.entry.id;

        EntryService.delete({id: entryId}, function(success) {
            for(var i = 0; i < $scope.entriesByDay[day].length; i++) {
                if($scope.entriesByDay[day][i].id === entryId) {
                    $scope.entriesByDay[day].splice(i, 1);
                }
            }
        }, function(error) {
            // TODO(fsareshwala): fill me in
        });
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
