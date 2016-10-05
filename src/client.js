'use strict'

const merge = require('merge')
const jwtDecode = require('jwt-decode')

function installVuePlugin(Vue, options) {
    const sToMs = (seconds) => {
        return seconds * 1000
    }

    const defaultOptions = {
        registerEndpoint: '/auth/register',
        loginEndpoint: '/auth/login',
        refreshEndpoint: '/auth/refresh',
        storageKey: 'jsonwebtoken',
        bearerLexem: 'Bearer '
    }

    options = merge(defaultOptions, options)

    const Token = new function() {
        this.get = () => {
            return localStorage.getItem(options.storageKey)
        }

        this.set = (value) => {
            localStorage.setItem(options.storageKey, value)
        }

        this.remove = () => {
            localStorage.removeItem(options.storageKey)
        }

        this.valid = () => {
            let token = this.get()
            if (token !== null) {
                let tokenExpMs = sToMs(jwtDecode(token).exp)
                let nowMs = new Date().getTime()
                return tokenExpMs - nowMs > sToMs(60)
            } else {
                return false
            }
        }
    }

    function Auth(instance) {
        this.register = (username, password) => {
            return instance.$http
                .post(options.registerEndpoint, { username, password })
                .bind(instance)
        }

        this.logIn = (username, password) => {
            return instance.$http
                .post(options.loginEndpoint, { username, password })
                .bind(instance)
                .then((response) => { Token.set(response.body) })
        }

        this.refresh = () => {
            return instance.$http
                .post(options.refreshEndpoint, null, { bearer: true })
                .bind(instance)
                .then((response) => { Token.set(response.body) })
        }

        this.logOut = Token.remove
        this.isLoggedIn = Token.valid
        this.getToken = Token.get
    }

    Object.defineProperty(Vue.prototype, '$auth', {
        get: function() {
            return new Auth(this)
        }
    })

    Vue.http.interceptors.push(function(request, next) {
        if (request.bearer) {
            if (!Token.valid()) {
                return next(request.respondWith(null, {
                    status: 401,
                    statusText: 'Request demands JWT but user was not logged in'
                }))
            } else {
                request.headers.set('Authorization',
                    options.bearerLexem + Token.get())
                return next()
            }
        } else {
            return next()
        }
    })
}

module.exports = {
    Client: installVuePlugin
}
