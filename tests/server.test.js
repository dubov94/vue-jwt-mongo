'use strict'

const VueJwtMongo = require('../source/server')
const chai = require('chai')
const chaiHttp = require('chai-http')
const express = require('express')
const jsonwebtoken = require('jsonwebtoken')
const { MongoMemoryServer } = require('mongodb-memory-server')

chai.use(chaiHttp)
const assert = chai.assert
const globalDescribe = (title, body) => {
    describe(title, function() {
        this.timeout(8000)
        body()
    })
}

globalDescribe('Server', async () => {
    const DEFAULT_PASSWORD = 'password'
    const JWT_SECRET = 'shhh'

    let mongoServer = null

    before(async () => {
        mongoServer = await MongoMemoryServer.create();
    });

    after(async () => {
        await mongoServer.stop();
    });

    let application = null
    let userCounter = 0

    const getNextUserName = () => `user-${userCounter++}`
    const generateCredentials = () => ({
        username: getNextUserName(),
        password: DEFAULT_PASSWORD
    })

    const makeAuthRegisterRequest = (credentials, callback) => {
        chai.request(application)
            .post('/auth/register')
            .send(credentials)
            .end(callback)
    }
    const makeAuthLoginRequest = (credentials, callback) => {
        chai.request(application)
            .post('/auth/login')
            .send(credentials)
            .end(callback)
    }
    const makeAuthRefreshRequest = (token, callback) => {
        chai.request(application)
            .post('/auth/refresh')
            .set('Authorization', 'Bearer ' + token)
            .end(callback)
    }
    const makeProtectedRequest = (token, callback) => {
        chai.request(application)
            .get('/protected')
            .set('Authorization', 'Bearer ' + token)
            .end(callback)
    }

    const assertResponseStatusCallDone = (status, done) => {
        return (error, response) => {
            assert.equal(response.status, status)
            done()
        }
    }

    before(() => {
        let vjmServer = VueJwtMongo.Server({
            mongoUrl: mongoServer.getUri(),
            jwtSecret: JWT_SECRET
        })
        
        // One can use https://www.npmjs.com/package/morgan for debugging.
        application = express()

        application.post('/auth/register', vjmServer.registerHandler)
        application.post('/auth/login', vjmServer.loginHandler)
        application.post('/auth/refresh', vjmServer.refreshHandler)
        application.get('/protected', vjmServer.jwtProtector,
            (request, response) => { response.sendStatus(200) })
    })

    describe('/auth/register', () => {
        it('rejects a payload with no values', (done) => {
            makeAuthRegisterRequest({}, assertResponseStatusCallDone(400, done))
        })

        it('accepts a pair of strings', (done) => {
            makeAuthRegisterRequest(generateCredentials(),
                assertResponseStatusCallDone(200, done))
        })
    })

    describe('/auth/login', () => {
        let credentials = null

        before((done) => {
            credentials = generateCredentials()
            makeAuthRegisterRequest(credentials, done)
        })

        it('rejects a payload with no values', (done) => {
            makeAuthLoginRequest({}, assertResponseStatusCallDone(400, done))
        })

        it('rejects invalid credentials', (done) => {
            makeAuthLoginRequest({ username: 'foo', password: 'bar' },
                assertResponseStatusCallDone(401, done))
        })

        it('accepts valid credentials and generates a token', (done) => {
            makeAuthLoginRequest(credentials, (error, response) => {
                let payload = jsonwebtoken.verify(response.text, JWT_SECRET)
                assert.equal(payload.username, credentials.username)
                done()
            })
        })
    })

    describe('/auth/refresh', () => {
        let signature = null

        before((done) => {
            let credentials = generateCredentials()
            makeAuthRegisterRequest(credentials, () => {
                makeAuthLoginRequest(credentials, (error, response) => {
                    signature = response.text
                    done()
                })
            })
        })

        it('rejects a non-existing username', (done) => {
            makeAuthRefreshRequest(
                jsonwebtoken.sign({ username: 'foo' }, JWT_SECRET),
                assertResponseStatusCallDone(400, done)
            )
        })

        it('accepts a valid token and generates a new one', (done) => {
            let originalToken = jsonwebtoken.verify(signature, JWT_SECRET);
            setTimeout(() => {
                makeAuthRefreshRequest(signature, (error, response) => {
                    let newToken = jsonwebtoken.verify(
                        response.text, JWT_SECRET)
                    assert.equal(originalToken.username, newToken.username)
                    assert.isAbove(newToken.exp, originalToken.exp)
                    done()
                })
            }, 1000)
        })
    })

    describe('/protected', () => {
        let credentials = null
        let signature = null

        before((done) => {
            credentials = generateCredentials()
            makeAuthRegisterRequest(credentials, () => {
                makeAuthLoginRequest(credentials, (error, response) => {
                    signature = response.text
                    done()
                })
            })
        })

        it('rejects a malformed signature', (done) => {
            makeProtectedRequest(
                jsonwebtoken.sign({ username: credentials.username }, 'bar'),
                assertResponseStatusCallDone(401, done)
            )
        })

        it('rejects a payload with no values', (done) => {
            makeProtectedRequest(
                jsonwebtoken.sign({}, JWT_SECRET),
                assertResponseStatusCallDone(400, done)
            )
        })

        it('rejects a non-existing username', (done) => {
            makeProtectedRequest(
                jsonwebtoken.sign({ username: 'foo' }, JWT_SECRET),
                assertResponseStatusCallDone(400, done)
            )
        })

        it('accepts a valid signature', (done) => {
            makeProtectedRequest(signature,
                assertResponseStatusCallDone(200, done))
        })
    })
})
