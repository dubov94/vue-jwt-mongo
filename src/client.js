'use strict'

module.exports = function(Vue, options) {
    const merge = require('merge')
    const jwtDecode = require('jwt-decode')

    const sToMs = (seconds) => {
        return seconds * 1000
    }

    const defaultOptions = {
        registerEndpoint: '/auth/register',
        loginEndpoint: '/auth/login',
        storageKey: 'jsonwebtoken',
        bearerLexem: 'Bearer '
    }

    options = merge(defaultOptions, options)

    function CToken() {
        this.get = () => {
            return localStorage.getItem(options.storageKey)
        }

        this.set = (value) => {
            localStorage.setItem(options.storageKey, value)
        }

        this.remove = () => {
            localStorage.removeItem(options.storageKey)
        }
    }

    function CAuth() {
        this.token = new CToken()

        this.register = (username, password, successCallback, errorCallback) => {
            Vue.http.post(options.registerEndpoint, {
                username,
                password
            }).then(successCallback, errorCallback)
        }

        this.logIn = (username, password, successCallback, errorCallback) => {
            Vue.http.post(options.loginEndpoint, {
                username,
                password
            }).then((response) => {
                this.token.set(response.text())
                successCallback()
            }, errorCallback)
        }

        this.logOut = () => {
            this.token.remove()
        }

        this.isLoggedIn = () => {
            let token = this.token.get()
            if (token !== null) {
                let tokenExpMs = sToMs(jwtDecode(token).exp)
                let nowMs = new Date().getTime()
                return tokenExpMs - nowMs > sToMs(60)
            } else {
                return false
            }
        }
    }

    const Auth = new CAuth()

    Object.defineProperty(Vue.prototype, '$auth', {
        value: Auth
    })

    Vue.http.interceptors.push(function(request, next) {
        if (request.bearer) {
            if (!Auth.isLoggedIn()) {
                return next(request.respondWith(null, {
                    status: 401,
                    statusText:
                        'Request demands JWT but user was not logged in'
                }))
            } else {
                request.headers.Authorization =
                    options.bearerLexem + Auth.token.get()
                return next()
            }
        } else {
            return next()
        }
    })
}
