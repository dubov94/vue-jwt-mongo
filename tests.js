'use strict'

const vueJwtMongo = require('./index.js')
const assert = require('chai').assert
const Vue = require('vue')

describe('Client', () => {
    Vue.use(vueJwtMongo.Client)
    let vm

    beforeEach(() => {
        vm = new Vue({})
    })

    it('shares $auth instance', () => {
        let anotherVm = new Vue({})
        /* $auth should point to the same object */
        assert.strictEqual(vm.$auth, anotherVm.$auth)
    })

    it('should set user after login', () => {
        vm.$auth.login('user', 'pass')
        assert.equal(vm.$auth.user, 'user')
    })

    it('should unset user after logout', () => {
        vm.$auth.login('foo', 'bar')
        vm.$auth.logout()
        assert.equal(vm.$auth.user, null)
    })
})
