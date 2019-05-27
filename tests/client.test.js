'use strict'

const Vue = require('vue')
const VueJwtMongo = require('../source/client')
const assert = require('chai').assert
const domStorage = require('dom-storage')
const jsdom = require('jsdom')
const jsonwebtoken = require('jsonwebtoken')

describe('Client', () => {
    const generateToken = () => jsonwebtoken.sign(
        { username: 'login' }, 'shhh', { expiresIn: 60 * 60 })
    const originalToken = generateToken()

    let sinon = null
    let vm = null

    before(() => {
        const { window } = new jsdom.JSDOM('');
        global.window = window
        global.document = window.document
        global.location = window.location
        global.XMLHttpRequest = window.XMLHttpRequest
        global.localStorage = new domStorage(null, {
            strict: true
        })
        global.Vue = Vue

        // XMLHttpRequest should be defined in globals earlier than
        // sinon requirement happens (see getWorkingXHR() in sinon).
        sinon = require('sinon')

        Vue.use(require('vue-resource'))
        Vue.use(VueJwtMongo.Client)
    })

    beforeEach(() => {
        vm = new Vue({})
        localStorage.clear()
    })

    describe('$auth.register, $auth.logIn & $auth.refresh', () => {
        let server

        beforeEach(() => {
            server = sinon.fakeServer.create()
            server.respondImmediately = true

            // See https://github.com/vuejs/vue-resource/issues/440.
            let fakeXhr = sinon.FakeXMLHttpRequest
            let xhrOnCreate = fakeXhr.onCreate.bind(fakeXhr)
            fakeXhr.onCreate = (request) => {
                xhrOnCreate(request)

                delete request.responseType
                let xhrSend = request.send.bind(request)
                request.send = function(data) {
                    request.responseType = ''
                    xhrSend(data)
                }
            }
        })

        afterEach(() => {
            server.restore()
        })

        it('$auth.register sends a request to /auth/register', (done) => {
            server.respondWith([200, {}, ''])
            vm.$auth.register('user', 'pass').then(function() {
                assert.strictEqual(this, vm)
                assert.equal(server.requests[0].url, '/auth/register')
                done()
            })
        })

        it('$auth.logIn, $auth.getToken & $auth.logOut', (done) => {
            server.respondWith(originalToken)
            vm.$auth.logIn('user', 'pass').then(function() {
                assert.strictEqual(this, vm)
                assert.equal(server.requests[0].url, '/auth/login')
                assert.strictEqual(vm.$auth.getToken(), originalToken)
                assert.isTrue(vm.$auth.isLoggedIn())
                vm.$auth.logOut()
                assert.isFalse(vm.$auth.isLoggedIn())
                done()
            })
        })

        it('$auth.logIn sends random credentials => calls `catch`', (done) => {
            server.respondWith([401, {}, ''])
            vm.$auth.logIn('fail', 'fail').catch(function(response) {
                assert.strictEqual(this, vm)
                assert.equal(server.requests[0].url, '/auth/login')
                assert.isFalse(vm.$auth.isLoggedIn())
                assert.equal(response.status, 401)
                done()
            })
        })

        it('$auth.refresh', (done) => {
            let newToken = generateToken()
            server.respondWith(newToken)
            localStorage['jsonwebtoken'] = originalToken
            vm.$auth.refresh().then(function() {
                let request = server.requests[0]
                assert.equal(request.url, '/auth/refresh')
                assert.equal(request.requestHeaders.Authorization,
                    'Bearer ' + originalToken)
                assert.equal(vm.$auth.getToken(), newToken)
                vm.$auth.logOut()
                done()
            })
        })
    })

    describe('vue-resource', () => {
        const expectXhr = (expectation) => {
            xhr.onCreate = (request) => {
                request.send = () => {
                    expectation(request)
                }
            }
        }

        let xhr = null

        beforeEach(() => {
            xhr = sinon.useFakeXMLHttpRequest()
        })

        afterEach(() => {
            xhr.restore()
        })

        it('gets `bearer` => appends Authorization header', (done) => {
            expectXhr((request) => {
                assert.equal(
                    request.requestHeaders.Authorization,
                    'Bearer ' + originalToken)
                done()
            })
            localStorage['jsonwebtoken'] = originalToken
            vm.$http.get('/', {
                bearer: true
            })
        })

        it('gets `bearer` when there is no token => throws 401', () => {
            vm.$http.get('/', {
                bearer: true
            }).then(null, (response) => {
                assert.equal(response.status, 401)
            })
        })

        it('does not get `bearer` => forwards the request as-is', (done) => {
            expectXhr(() => {
                done()
            })
            vm.$http.get('/')
        })
    })
})
