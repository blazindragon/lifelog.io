String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var didYouKnowList = [
    "We have a [blog](http://blog.lifelog.io) where you can find out about the latest updates to the lifelog platform.",
    "Lifelog has hashtags! Use them by prepending a word with the hash (#) symbol. Create subtags with slashes in between words (#work/social). Later, you can filter by hashtag.",
    "If the command line is more your forte, lifelog has a [command line client](http://www.github.com/lifelog/lg) too. Log your entries from the comfort of your shell and get back to whatever you were doing in no time at all.",
];


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

app.filter('markdown', function() {
    var converter = new Showdown.converter();

    return function(input) {
        return converter.makeHtml(input);
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
    $scope.didYouKnow = didYouKnowList[Math.floor(Math.random() * didYouKnowList.length)];
    $scope.page = 0;

    $scope.entryCollection = {
        entriesByDay: {},
        entriesList: [],
        allTags: {},

        reset: function() {
            this.entriesByDay = {};
            this.entriesList = [];
            this.allTags = {};

            // always have an entry box for today
            var today = moment().format(app.dateFormat);
            this.entriesByDay[today] = [];
            this.entriesList.push({
                day: today,
                entryList: $scope.entryCollection.entriesByDay[today]
            });
        },

        insert: function(entry) {
            var day = moment.utc(entry.timestamp).local().format(app.dateFormat);

            if(!(day in this.entriesByDay)) {
                this.entriesByDay[day] = [];
                this.entriesList.push({day: day, entryList: this.entriesByDay[day]});
            }

            this.entriesByDay[day].push(entry);
            this._addEntryTags(entry);
        },

        _addEntryTags: function(entry) {
            for(var i = 0; i < entry.tags.length; i++) {
                var tag = entry.tags[i];

                if(tag.length == 0) {
                    continue;
                }

                if(!(tag in this.allTags)) {
                    this.allTags[tag] = {tag: tag, count: 0};
                }

                // track the number of entries each tag has associated with it
                this.allTags[tag].count++;
            }
        },

        _removeEntryTags: function(entry) {
            for(var i = 0; i < entry.tags.length; i++) {
                var tag = entry.tags[i];
                if(tag.length == 0) {
                    continue;
                }

                if(!(tag in this.allTags)) {
                    continue;
                }

                this.allTags[tag].count--;

                // remove the tag from the list if all entries associated with it have been removed
                if(this.allTags[tag].count == 0) {
                    delete this.allTags[tag];
                }
            }
        },

        remove: function(entry) {
            var day = moment(entry.timestamp).format(app.dateFormat);
            var entries = this.entriesByDay[day];
            for(var i = 0; i < entries.length; i++) {
                var current_entry = entries[i];
                if(current_entry.id == entry.id) {
                    entries.splice(i, 1);
                    this._removeEntryTags(entry);
                }
            }
        },

        update: function(entryId, entry) {
            var day = moment(entry.timestamp).format(app.dateFormat);
            var entries = this.entriesByDay[day];
            for(var i = 0; i < entries.length; i++) {
                var current_entry = entries[i];
                if(current_entry.id == entry.id) {
                    entries[i] = entry;
                    this._addEntryTags(entry);
                }
            }
        }
    };

    $scope.load = function($resource) {
        if(!$rootScope.loggedIn) {
            var user = AccountService.get({}, function(success) {
                $rootScope.user = user;
                $rootScope.loggedIn = true;
            }, function(error) {
                $rootScope.loggedIn = false;
            });
        }

        $scope.entryCollection.reset();

        var func = EntryService.query;
        var params = {page: $scope.page};

        if($routeParams.tag) {
            $scope.viewingTag = true;
            $scope.tagFilter = $routeParams.tag;

            func = EntryService.queryTag;
            params.tag = $routeParams.tag;
        }
        else {
            $scope.viewingTag = false;
            $scope.tagFilter = '';
        }

        var raw = func(params, function(success) {
            for(var i = 0; i < raw.length; i++) {
                $scope.entryCollection.insert(raw[i]);
            }
        }, function(error) {
            // TODO(fsareshwala): fill me in
        });
    };

    $scope.addEntry = function(day, content, $resource) {
        if(!content) {
            return;
        }

        var entry = {
            content: content,
            timestamp: moment(day, app.dateFormat)
        };

        var response = EntryService.save(entry, function(success) {
            $scope.entryCollection.insert(response);
        }, function(error) {
            // TODO(fsareshwala): fill me in
        });
    };

    $scope.editEntry = function(entry, $resource) {
        $scope.entryCollection._removeEntryTags(this.entry);
        var entry = {
            id: entry.id,
            content: entry.original_content
        };

        var response = EntryService.update(entry, function(success) {
            $scope.entryCollection.update(entry.id, response);
        }, function(error) {
            // TODO(fsareshwala): fill me in
        });
    };

    $scope.deleteEntry = function(entry, $resource) {
        EntryService.delete({id: entry.id}, function(success) {
            $scope.entryCollection.remove(entry);
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
