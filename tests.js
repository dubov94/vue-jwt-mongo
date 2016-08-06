'use strict'

const VueJwtMongo = require('./index.js')
const assert = require('chai').assert
const jsdom = require('jsdom')

describe('Client', () => {
    const Vue = require('vue')

    before(function(done) {
        jsdom.env('', function(err, window) {
            GLOBAL.window = window
            GLOBAL.document = window.document
            GLOBAL.location = window.location
            GLOBAL.XMLHttpRequest = window.XMLHttpRequest

            Vue.use(require('vue-resource'))
            Vue.use(require('vue-router'))
            Vue.use(VueJwtMongo.Client)

            done()
        })
    })

    let vm = new Vue({})

    it('shares $auth.identity', () => {
        let anotherVm = new Vue()
        vm.$auth.identity = 'foo'
        assert.equal(anotherVm.$auth.identity, 'foo')
    })

    it('sets user after login', () => {
        vm.$auth.login('user', 'pass')
        assert.equal(vm.$auth.identity, 'user')
    })

    it('unsets user after logout', () => {
        vm.$auth.login('foo', 'bar')
        vm.$auth.logout()
        assert.equal(vm.$auth.identity, null)
    })
})
