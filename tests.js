'use strict'

const VueJwtMongo = require('./index')
const assert = require('chai').assert

describe('Client', () => {
    const Vue = require('vue')
    const jsdom = require('jsdom')
    const domStorage = require('dom-storage')
    let vm, sinon

    before((done) => {
        jsdom.env('', (err, window) => {
            global.window = window
            global.document = window.document
            global.location = window.location
            global.XMLHttpRequest = window.XMLHttpRequest
            global.localStorage = new domStorage(null, {
                strict: true
            })
            global.Vue = Vue

            /* XMLHttpRequest should be defined in globals earlier than
            sinon requirement happens (see getWorkingXHR() in sinon) */
            sinon = require('sinon')

            Vue.use(require('vue-resource'))
            Vue.use(require('vue-router'))
            Vue.use(VueJwtMongo.Client)

            done()
        })
    })

    beforeEach(() => {
        vm = new Vue({})
        localStorage.clear()
    })

    describe('Login', () => {
        let server

        beforeEach(() => {
            server = sinon.fakeServer.create()
            server.respondImmediately = true
        })

        afterEach(() => {
            server.restore()
        })

        it('logs in and out with valid credentials', (done) => {
            server.respond('jwt')
            let errorCallback = sinon.spy()
            vm.$auth.logIn('user', 'pass', () => {
                assert.strictEqual(vm.$auth.token.get(), 'jwt')
                assert.isTrue(vm.$auth.isLoggedIn())
                vm.$auth.logOut()
                assert.isFalse(vm.$auth.isLoggedIn())
                done()
            }, errorCallback)
            assert.isFalse(errorCallback.called)
        })

        it('fires error callback on invalid credentials', (done) => {
            server.respondWith([401, {}, ''])
            let successCallback = sinon.spy()
            vm.$auth.logIn('fail', 'fail', successCallback, (response) => {
                assert.isFalse(vm.$auth.isLoggedIn())
                assert.equal(response.status, 401)
                done()
            })
            assert.isFalse(successCallback.called)
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
                assert.equal(request.requestHeaders.Authorization, 'Bearer jwt')
                done()
            })
            vm.$auth.token.set('jwt')
            vm.$http.get('/', {
                bearer: true
            })
        })

        it('responses 401 if user is not logged in', () => {
            vm.$http.get('/', {
                bearer: true
            }).then(null, (response) => {
                assert.isEqual(response.status, 401)
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
