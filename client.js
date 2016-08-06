;
(function() {
    'use strict'

    let auth = {
        user: null,
        login(username, password) {
            this.user = username;
        },
        logout() {
            this.user = null;
        }
    }

    function install(Vue, options) {
        Object.defineProperties(Vue.prototype, {
            $auth: {
                get() {
                    auth.$route = this.$route
                    auth.$router = this.$router
                    return auth
                }
            }
        })
    }

    /* istanbul ignore next */
    if (typeof exports == "object") {
        module.exports = install
    } else if (typeof define == "function" && define.amd) {
        define([], () => install)
    } else if (window.Vue) {
        Vue.use(install)
    }
})()
