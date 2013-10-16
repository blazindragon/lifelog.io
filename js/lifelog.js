String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

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
    when('/user/password', {controller:'PasswordCtrl', templateUrl:'partials/change_password.html'}).
    when('/about', {templateUrl:'partials/about.html'}).

    when('/api_documentation', {templateUrl:'pages/api_documentation.md'}).
    when('/applications', {templateUrl:'applications.html'}).
    when('/faq', {templateUrl:'pages/faq.md'}).
    when('/open_source', {templateUrl:'pages/open_source.md'}).
    when('/privacy_policy', {templateUrl:'pages/privacy_policy.md'}).

    otherwise({redirectTo:'/'});
});

app.config(function($httpProvider) {
    var converter = new Showdown.converter();

    $httpProvider.interceptors.push(function($q) {
        return {
            'response': function(response) {
                if(response.config.url.endsWith('.md')) {
                    response.data = converter.makeHtml(response.data);
                }

                return response;
            }
        }
    });
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

        if(input[0] === '#') {
            input = input.slice(1);
        }

        var elements = input.split('/');
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
        delete: {method:'DELETE'},
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
            $scope.viewingTag = true;
            $scope.tagFilter = $routeParams.tag;

            func = EntryService.queryTag;
            params = {tag:$routeParams.tag};
        }
        else {
            $scope.viewingTag = false;
            $scope.tagFilter = '';
        }

        // always have an entry box for the last week
        var today = moment();
        for(var i = 0; i <= 7; i++) {
            var day = today.subtract('days', i).format(app.dateFormat);
            $scope.entriesByDay[day] = [];
            $scope.entriesList.push({day: day, entryList: $scope.entriesByDay[day]});
        }

        var raw = func(params, function(success) {
            for(var i = 0; i < raw.length; i++) {
                var date = moment.utc(raw[i].timestamp).local().format(app.dateFormat);

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
    return $resource('/api/user/password');
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
