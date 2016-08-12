'use strict'

const assert = require('chai').assert
const jsdom = require('jsdom')
const domStorage = require('dom-storage')
const Vue = require('vue')
const VueJwtMongo = require('../src/index')
const jsonwebtoken = require('jsonwebtoken')

describe('Client', () => {
    const validToken = jsonwebtoken.sign(
        { username: 'login' }, 'shhh', { expiresIn: 60 * 60 })
    let vm, sinon

    before((done) => {
        jsdom.env('', (error, window) => {
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

            done(error)
        })
    })

    beforeEach(() => {
        vm = new Vue({})
        localStorage.clear()
    })

    describe('Register & Login', () => {
        let server

        beforeEach(() => {
            server = sinon.fakeServer.create()
            server.respondImmediately = true
        })

        afterEach(() => {
            server.restore()
        })

        it('sends registration request', (done) => {
            server.respondWith([200, {}, ''])
            vm.$auth.register('user', 'pass', () => {
                assert.equal(server.requests[0].url, '/auth/register')
                done()
            })
        })

        it('logs in and out with valid credentials', (done) => {
            server.respond(validToken)
            vm.$auth.logIn('user', 'pass', () => {
                assert.equal(server.requests[0].url, '/auth/login')
                assert.strictEqual(vm.$auth.token.get(), validToken)
                assert.isTrue(vm.$auth.isLoggedIn())
                vm.$auth.logOut()
                assert.isFalse(vm.$auth.isLoggedIn())
                done()
            })
        })

        it('fires error callback on invalid credentials', (done) => {
            server.respondWith([401, {}, ''])
            vm.$auth.logIn('fail', 'fail', null, (response) => {
                assert.equal(server.requests[0].url, '/auth/login')
                assert.isFalse(vm.$auth.isLoggedIn())
                assert.equal(response.status, 401)
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
            vm.$auth.token.set(validToken)
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