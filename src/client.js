'use strict'

const merge = require('merge')

function CToken(key) {
    this.get = () => {
        return localStorage.getItem(key)
    }

    this.set = (value) => {
        localStorage.setItem(key, value)
    }

    this.remove = () => {
        localStorage.removeItem(key)
    }
}

function CAuth(Vue, options) {
    this.token = new CToken('jsonwebtoken')

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
        return this.token.get() !== null
    }
}

function interceptionFactory(Auth) {
    return function(request, next) {
        if (request.bearer) {
            if (!Auth.isLoggedIn()) {
                next(request.respondWith(null, {
                    status: 401,
                    statusText:
                        'Request demands JWT but user was not logged in'
                }))
            } else {
                request.headers.Authorization = 'Bearer ' + Auth.token.get()
                next()
            }
        } else {
            next()
        }
    }
}

const defaultOptions = {
    registerEndpoint: '/auth/register',
    loginEndpoint: '/auth/login'
}

function install(Vue, options) {
    options = merge(defaultOptions, options)

    const Auth = new CAuth(Vue, options)

    Object.defineProperty(Vue.prototype, '$auth', {
        value: Auth
    })

    Vue.http.interceptors.push(interceptionFactory(Auth))
}

module.exports = install
