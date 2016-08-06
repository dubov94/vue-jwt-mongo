'use strict'

/* Binded to AuthClosure.identity via Object.defineProperty. */
let identity = null

function AuthClosure(instance) {
    this.login = function(username, password) {
        this.identity = username
    }

    this.logout = () => {
        this.identity = null
    }
}

Object.defineProperty(AuthClosure.prototype, 'identity', {
    get() {
        return identity
    },
    set(value) {
        identity = value
    }
})

function install(Vue, options) {
    Object.defineProperty(Vue.prototype, '$auth', {
        get() {
            return new AuthClosure(this)
        }
    })
}

module.exports = install
