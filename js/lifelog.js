var app = angular.module('lifelog', ['ngResource']);
app.dateFormat = 'dddd, MMMM D, YYYY';

app.config(function($routeProvider) {
    $routeProvider.
    when('/', {controller:'EntryCtrl', templateUrl:'main.html'}).
    when('/tag/*tag', {controller:'EntryCtrl', templateUrl:'main.html'}).
    when('/signin', {controller:'AuthCtrl', templateUrl:'partials/signin.html'}).
    when('/signout', {controller:'AuthCtrl', templateUrl:'partials/signout.html'}).
    when('/signup', {controller:'SignupCtrl', templateUrl:'partials/signup.html'}).
    when('/edit_profile', {controller:'AccountCtrl', templateUrl:'partials/edit_profile.html'}).
    when('/change_password', {controller:'PasswordCtrl', templateUrl:'partials/change_password.html'}).
    otherwise({redirectTo:'/'});
});

app.directive('markdown', function() {
    var converter = new Showdown.converter();

    return {
        restrict: 'E',
        link: function(scope, element, attrs) {
            var html = converter.makeHtml(element.text());
            element.html(html);
        }
    }
});

app.filter('splitTag', function() {
    return function(input) {
        if(!input) {
            return;
        }

        var nohash = input.slice(1);
        var elements = nohash.split('/');

        if(!elements || elements.length == 0) {
            return;
        }

        var output = {};
        var key = '';
        for(var i = 0; i < elements.length; i++) {
            key += elements[i];
            output[key] = elements[i];
            key += '/';
        }

        return output;
    }
});

app.filter('sortEntries', function() {
    return function(input) {
        input.sort(function(left, right) {
            var leftDate = moment.utc(left.day, app.dateFormat);
            var rightDate = moment.utc(right.day, app.dateFormat);
            return rightDate - leftDate;
        });

        return input;
    }
});

app.factory('EntryService', function($resource) {
    return $resource('/api/entry/:id', {}, {
        query: {method:'GET', isArray:true},
        queryTag: {method: 'GET', params:{tag:'@tag'}, isArray:true},
        save: {method:'POST'},
        remove: {method:'DELETE'},
        update: {method:'PUT', params:{id:'@id'}}
    });
});

app.controller('EntryCtrl', function($scope, $rootScope, $routeParams,
        EntryService, AccountService) {
    $scope.entriesByDay = {};
    $scope.entriesList = [];

    $scope.load = function($resource) {
        if(!$rootScope.loggedIn) {
            var user = AccountService.get({}, function(success) {
                $rootScope.user = user;
                $rootScope.loggedIn = true;
            }, function(error) {
                $rootScope.loggedIn = false;
            });
        }

        var func = EntryService.query;
        var params = {};
        if($routeParams.tag) {
            func = EntryService.queryTag;
            params = {tag:$routeParams.tag};
        }

        // always have an entry box for today
        var today = moment().format(app.dateFormat);
        $scope.entriesByDay[today] = [];
        $scope.entriesList.push({day: today, entryList: $scope.entriesByDay[today]});

        var raw = func(params, function(success) {
            for(var i = 0; i < raw.length; i++) {
                var date = moment.utc(raw[i].timestamp).format(app.dateFormat);

                if(!(date in $scope.entriesByDay)) {
                    $scope.entriesByDay[date] = [];
                    $scope.entriesList.push({day: date, entryList: $scope.entriesByDay[date]});
                }

                $scope.entriesByDay[date].push(raw[i]);
            }
        }, function(error) {
            // TODO(fsareshwala): fill me in
        });
    };

    $scope.addEntry = function($resource) {
        if(!this.newContent) {
            return;
        }

        var day = this.element.day;
        var content = this.newContent;
        this.newContent = '';

        var entry = {
            content: content,
            timestamp: moment.utc(day, app.dateFormat)
        };

        var response = EntryService.save(entry, function(success) {
            $scope.entriesByDay[day].push(response);
        }, function(error) {
            // TODO(fsareshwala): fill me in
        });
    };

    $scope.editEntry = function($resource) {
        var day = this.element.day;
        var entryId = this.entry.id;

        var entry = {
            id: this.entry.id,
            content: this.entry.original_content
        };

        var response = EntryService.update(entry, function(success) {
            for(var i = 0; i < $scope.entriesByDay[day].length; i++) {
                var cur = $scope.entriesByDay[day][i];
                if(cur.id === entryId) {
                    $scope.entriesByDay[day][i] = response;
                }
            }
        }, function(error) {
            // TODO(fsareshwala): fill me in
        });
    };

    $scope.deleteEntry = function($resource) {
        var day = this.element.day;
        var entryId = this.entry.id;

        EntryService.delete({id: entryId}, function(success) {
            for(var i = 0; i < $scope.entriesByDay[day].length; i++) {
                var cur = $scope.entriesByDay[day][i];
                if(cur.id === entryId) {
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
