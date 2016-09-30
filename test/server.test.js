'use strict'

const VueJwtMongo = require('../src/server')
const express = require('express')
const chai = require('chai')
const chaiHttp = require('chai-http')
const mongoose = require('mongoose')
const passport = require('passport')
const jsonwebtoken = require('jsonwebtoken')
const morgan = require('morgan')

chai.use(chaiHttp)
const assert = chai.assert

// Tests are dependant on order.
describe('Server', () => {
    const mongoUrl = 'mongodb://localhost/vjmt'
    const jwtSecret = 'shhh'
    let user = {
        credentials: {
            username: 'login',
            password: 'pass'
        },
        signature: null
    }
    let app

    before(() => {
        let vjmServer = VueJwtMongo.Server({
            mongoUrl,
            jwtSecret
        })
        app = express()
        // app.use(morgan('combined'))
        app.post('/auth/register', vjmServer.registerHandler)
        app.post('/auth/login', vjmServer.loginHandler)
        app.post('/auth/refresh', vjmServer.refreshHandler)
        app.get('/protected', vjmServer.jwtProtector, (request, response) => {
            response.sendStatus(200)
        })
    })

    after((done) => {
        // This is also a test in a sense that the default
        // mongoose connection object is available.
        mongoose.connect(mongoUrl, () => {
            mongoose.connection.db.dropDatabase(() => {
                done()
            })
        })
    })

    describe('Registration', () => {
        let testStatus = (credentials, expectedStatus, done) => {
            chai.request(app)
                .post('/auth/register')
                .send(credentials)
                .end((error, response) => {
                    assert.equal(response.status, expectedStatus)
                    done()
                })
        }

        it('rejects empty input', (done) => {
            testStatus({}, 400, done)
        })

        it('registers a user', (done) => {
            testStatus(user.credentials, 200, done)
        })
    })

    describe('Login', () => {
        let testCallback = (credentials, callback, done) => {
            chai.request(app)
                .post('/auth/login')
                .send(credentials)
                .end((error, response) => {
                    callback(error, response)
                    done()
                })
        }

        let testStatus = (credentials, expectedStatus, done) => {
            testCallback(credentials, (error, response) => {
                assert.equal(response.status, expectedStatus)
            }, done)
        }

        it('with valid credentials', (done) => {
            testCallback(user.credentials, (error, response) => {
                let payload = jsonwebtoken.verify(response.text, jwtSecret)
                assert.equal(payload.username, user.credentials.username)
                user.signature = response.text
            }, done)
        })

        it('with invalid credentials', (done) => {
            testStatus({
                username: 'foo',
                password: 'bar'
            }, 401, done)
        })

        it('with malformed json', (done) => {
            testStatus({}, 400, done)
        })
    })

    describe('Refresh', () => {
        before((done) => {
            chai.request(app)
                .post('/auth/login')
                .send(user.credentials)
                .end((error, response) => {
                    user.signature = response.text
                    done()
                })
        })

        let testCallback = (token, callback, done) => {
            chai.request(app)
                .post('/auth/refresh')
                .set('Authorization', 'Bearer ' + token)
                .end((error, response) => {
                    callback(error, response)
                    done()
                })
        }

        it('saves updated token', (done) => {
            let oldToken = jsonwebtoken.verify(user.signature, jwtSecret);
            setTimeout(() => {
                testCallback(user.signature, (error, response) => {
                    let newToken = jsonwebtoken.verify(response.text, jwtSecret)
                    assert.equal(oldToken.username, newToken.username)
                    assert.isAbove(newToken.exp, oldToken.exp)
                    user.signature = response.text
                }, done)
            }, 1000)
        })

        it('rejects inexistant username', (done) => {
            testCallback(
                jsonwebtoken.sign({
                    username: 'foo'
                }, jwtSecret), (error, response) => {
                    assert.equal(response.status, 400)
                }, done)
        })
    })

    describe('Protected', () => {
        let testStatus = (token, expectedStatus, done) => {
            chai.request(app)
                .get('/protected')
                .set('Authorization', 'Bearer ' + token)
                .end((error, response) => {
                    assert.equal(response.status, expectedStatus)
                    done()
                })
        }

        it('with valid token', (done) => {
            testStatus(user.signature, 200, done)
        })

        it('with invalid token', (done) => {
            testStatus(
                jsonwebtoken.sign({
                    username: 'login'
                }, 'bar'), 401, done)
        })

        it('rejects empty username', (done) => {
            testStatus(jsonwebtoken.sign({}, jwtSecret), 400, done)
        })

        it('rejects inexistant username', (done) => {
            testStatus(
                jsonwebtoken.sign({
                    username: 'foo'
                }, jwtSecret), 400, done)
        })
    })
})
