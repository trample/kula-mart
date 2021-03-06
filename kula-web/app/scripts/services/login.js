angular.module('services.login', [
    'resources',
    'ezfb'
]);

angular.module('services.login')
    .factory('LoginService', ['$q', 'API', '$FB', '$rootScope', function ($q, API, $FB, $rootScope) {

        var service = {
            getLoginStatus: function () {

                var defer = $q.defer();

                $FB.getLoginStatus(function (res) {
                    if (res.status == 'connected') {
                        console.log('Broadcasting Facebook.Connected ...');
                        $rootScope.$broadcast('Facebook.Connected', res);
                        defer.resolve(res);
                    } else {
                        console.log('Broadcasting Facebook.NotConnected ...');
                        $rootScope.$broadcast('Facebook.NotConnected', res);
                        defer.reject(res);
                    }
                });

                return defer.promise;
            },

            login: function () {
                var defer = $q.defer();

                service.getLoginStatus().then(function(res) {
                    defer.resolve(res);
                }, function(err) {
                    $FB.login(function (res) {
                        if (res.status == 'connected') {
                            console.log('Broadcasting Facebook.Connected ...');
                            $rootScope.$broadcast('Facebook.Connected', res);
                            defer.resolve(res);
                        } else {
                            console.log('Broadcasting Facebook.NotConnected ...');
                            $rootScope.$broadcast('Facebook.NotConnected', res);
                            defer.reject(res);
                        }
                        defer.resolve(res);
                    }, {scope: 'email'});
                });

                return defer.promise;
            },

            logout: function () {
                var defer = $q.defer();

                $FB.logout(function (res) {
                    if (res.status == 'connected') {
                        console.log('Broadcasting Facebook.Connected ...');
                        $rootScope.$broadcast('Facebook.Connected', res);
                        defer.resolve(res);
                    } else {
                        console.log('Broadcasting Facebook.NotConnected ...');
                        $rootScope.$broadcast('Facebook.NotConnected', res);
                        defer.reject(res);
                    }
                    defer.resolve(res);
                });

                return defer.promise;
            },

            getUserInfo: function () {
                return $FB.api('/me');
            }
        };

        service.getLoginStatus();

        return service;
    }]);