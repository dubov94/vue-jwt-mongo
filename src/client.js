'use strict'

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

function CAuth() {
    this.token = new CToken('jsonwebtoken')

    this.logIn = (username, password, successCallback, errorCallback) => {
        Vue.http.post('/auth/login', {
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

const Auth = new CAuth()

function intercept(request, next) {
    if (request.bearer) {
        if (!Auth.isLoggedIn()) {
            next(request.respondWith('', {
                status: 401,
                statusText: 'Request demands JWT but user was not logged in'
            }))
        } else {
            request.headers.Authorization = 'Bearer ' + Auth.token.get()
            next()
        }
    } else {
        next()
    }
}

function install(Vue, options) {
    Object.defineProperty(Vue.prototype, '$auth', {
        value: Auth
    })

    Vue.http.interceptors.push(intercept)
}

module.exports = install
