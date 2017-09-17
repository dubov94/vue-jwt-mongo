'use strict'

const assert = require('chai').assert
const jsdom = require('jsdom')
const domStorage = require('dom-storage')
const Vue = require('vue')
const VueJwtMongo = require('../src/client')
const jsonwebtoken = require('jsonwebtoken')

describe('Client', () => {
    const generateToken = () => jsonwebtoken.sign(
        { username: 'login' }, 'shhh', { expiresIn: 60 * 60 })
    const validToken = generateToken()
    let vm, sinon

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

    describe('Register, Login & Refresh', () => {
        let server

        beforeEach(() => {
            server = sinon.fakeServer.create()
            server.respondImmediately = true

            // TODO: remove the following workaround
            // when https://github.com/vuejs/vue-resource/issues/440
            // is resolved.
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

        it('sends registration request and sets correct context', (done) => {
            server.respondWith([200, {}, ''])
            vm.$auth.register('user', 'pass').then(function() {
                assert.strictEqual(this, vm)
                assert.equal(server.requests[0].url, '/auth/register')
                done()
            })
        })

        it('logs in and out with valid credentials', (done) => {
            server.respondWith(validToken)
            vm.$auth.logIn('user', 'pass').then(function() {
                assert.strictEqual(this, vm)
                assert.equal(server.requests[0].url, '/auth/login')
                assert.strictEqual(vm.$auth.getToken(), validToken)
                assert.isTrue(vm.$auth.isLoggedIn())
                vm.$auth.logOut()
                assert.isFalse(vm.$auth.isLoggedIn())
                done()
            })
        })

        it('fires error callback on invalid credentials', (done) => {
            server.respondWith([401, {}, ''])
            vm.$auth.logIn('fail', 'fail').catch(function(response) {
                assert.strictEqual(this, vm)
                assert.equal(server.requests[0].url, '/auth/login')
                assert.isFalse(vm.$auth.isLoggedIn())
                assert.equal(response.status, 401)
                done()
            })
        })

        it('saves updated token', (done) => {
            let newToken = generateToken()
            server.respondWith(newToken)
            localStorage['jsonwebtoken'] = validToken
            vm.$auth.refresh().then(function() {
                let request = server.requests[0]
                assert.equal(request.url, '/auth/refresh')
                assert.equal(request.requestHeaders.Authorization,
                    'Bearer ' + validToken)
                assert.equal(vm.$auth.getToken(), newToken)
                vm.$auth.logOut()
                done()
            })
        })
    })

    describe('Interception', () => {
        let xhr,
            expectXhr = (expectation) => {
                xhr.onCreate = (request) => {
                    request.send = () => {
                        expectation(request)
                    }
                }
            }

        beforeEach(() => {
            xhr = sinon.useFakeXMLHttpRequest()
        })

        afterEach(() => {
            xhr.restore()
        })

        it('modifies bearer request', (done) => {
            expectXhr((request) => {
                assert.equal(
                    request.requestHeaders.Authorization,
                    'Bearer ' + validToken)
                done()
            })
            localStorage['jsonwebtoken'] = validToken
            vm.$http.get('/', {
                bearer: true
            })
        })

        it('responses 401 if user is not logged in', () => {
            vm.$http.get('/', {
                bearer: true
            }).then(null, (response) => {
                assert.equal(response.status, 401)
            })
        })

        it('skips no-bearer request', (done) => {
            expectXhr(() => {
                done()
            })
            vm.$http.get('/')
        })
    })
})
