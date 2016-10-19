'use strict';

var merge = require('merge');
var jwtDecode = require('jwt-decode');

function installVuePlugin(Vue, options) {
    var sToMs = function sToMs(seconds) {
        return seconds * 1000;
    };

    var defaultOptions = {
        registerEndpoint: '/auth/register',
        loginEndpoint: '/auth/login',
        refreshEndpoint: '/auth/refresh',
        storageKey: 'jsonwebtoken',
        bearerLexem: 'Bearer '
    };

    options = merge(defaultOptions, options);

    var Token = new function () {
        var _this = this;

        this.get = function () {
            return localStorage.getItem(options.storageKey);
        };

        this.set = function (value) {
            localStorage.setItem(options.storageKey, value);
        };

        this.remove = function () {
            localStorage.removeItem(options.storageKey);
        };

        this.valid = function () {
            var token = _this.get();
            if (token !== null) {
                var tokenExpMs = sToMs(jwtDecode(token).exp);
                var nowMs = new Date().getTime();
                return tokenExpMs - nowMs > sToMs(60);
            } else {
                return false;
            }
        };
    }();

    function Auth(instance) {
        this.register = function (username, password) {
            return instance.$http.post(options.registerEndpoint, { username: username, password: password }).bind(instance);
        };

        this.logIn = function (username, password) {
            return instance.$http.post(options.loginEndpoint, { username: username, password: password }).bind(instance).then(function (response) {
                Token.set(response.body);
            });
        };

        this.refresh = function () {
            return instance.$http.post(options.refreshEndpoint, null, { bearer: true }).bind(instance).then(function (response) {
                Token.set(response.body);
            });
        };

        this.logOut = Token.remove;
        this.isLoggedIn = Token.valid;
        this.getToken = Token.get;
    }

    Object.defineProperty(Vue.prototype, '$auth', {
        get: function get() {
            return new Auth(this);
        }
    });

    Vue.http.interceptors.push(function (request, next) {
        if (request.bearer) {
            if (!Token.valid()) {
                return next(request.respondWith(null, {
                    status: 401,
                    statusText: 'Request demands JWT but user was not logged in'
                }));
            } else {
                request.headers.set('Authorization', options.bearerLexem + Token.get());
                return next();
            }
        } else {
            return next();
        }
    });
}

module.exports = {
    Client: installVuePlugin
};