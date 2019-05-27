'use strict'

const merge = require('merge')
const jwtDecode = require('jwt-decode')

function installVuePlugin(Vue, options) {
    const sToMillis = (seconds) => {
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

    class Token {
        static get() {
            return localStorage.getItem(options.storageKey)
        }

        static set(value) {
            localStorage.setItem(options.storageKey, value)
        }

        static remove() {
            localStorage.removeItem(options.storageKey)
        }

        static isValid() {
            let token = Token.get()
            if (token !== null) {
                let tokenExpMs = sToMillis(jwtDecode(token).exp)
                let nowMs = new Date().getTime()
                return tokenExpMs - nowMs > sToMillis(60)
            } else {
                return false
            }
        }
    }

    class Auth {
        constructor(vueInstance) {
            this.vueInstance = vueInstance
        }
        
        register(username, password) {
            return this.vueInstance.$http
                .post(options.registerEndpoint, { username, password })
                .bind(this.vueInstance)
        }

        logIn(username, password) {
            return this.vueInstance.$http
                .post(options.loginEndpoint, { username, password })
                .bind(this.vueInstance)
                .then((response) => { Token.set(response.body) })
        }

        refresh() {
            return this.vueInstance.$http
                .post(options.refreshEndpoint, null, { bearer: true })
                .bind(this.vueInstance)
                .then((response) => { Token.set(response.body) })
        }

        logOut() {
            Token.remove()
        }

        isLoggedIn() {
            return Token.isValid()
        }

        getToken() {
            return Token.get()
        }
    }

    Object.defineProperty(Vue.prototype, '$auth', {
        get: function() {
            return new Auth(this)
        }
    })

    Vue.http.interceptors.push(function(request, next) {
        if (request.bearer) {
            if (!Token.isValid()) {
                return next(request.respondWith(null, {
                    status: 401,
                    statusText: 'Cannot make an authorized request'
                        + ' as the user is not logged in'
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
