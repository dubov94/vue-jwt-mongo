'use strict'

const bodyParser = require('body-parser')
const jsonwebtoken = require('jsonwebtoken')
const expressJwt = require('express-jwt')
const mongoose = require('mongoose')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')

function initialize(options) {
    // Create empty schema that is going to be used
    // by passport-local-mongoose.
    const UserSchema = new mongoose.Schema()
    // Now a corresponding model will have methods
    // such as createStrategy() and serializeUser().
    UserSchema.plugin(passportLocalMongoose)
    const User = mongoose.model('User', UserSchema)

    // We are following https://github.com/saintedlama/passport-local-mongoose
    // > Simplified Passport Configuration.
    passport.use(User.createStrategy())
    passport.serializeUser(User.serializeUser())
    passport.deserializeUser(User.deserializeUser())

    const jsonParser = bodyParser.json()
    // Endpoints with this middleware provided check the token for validity
    // and set request.user dictionary to payload.
    const jwtValidator = expressJwt({
        secret: options.secret
    })

    // See http://mongoosejs.com/docs/promises.html.
    mongoose.Promise = global.Promise
    mongoose.connect(options.mongo, (error) => {
        if (error) {
            /* istanbul ignore next */
            throw error
        }
    })

    function loginRespondent(request, response) {
        let token = jsonwebtoken.sign({
            username: request.body.username
        }, options.secret)
        response.send(token)
    }

    function registerRespondent(request, response, next) {
        User.register(new User({
            username: request.body.username
        }), request.body.password, (error) => {
            if (error) {
                response.sendStatus(400)
            } else {
                response.sendStatus(200)
            }
        })
    }

    function userValidator(request, response, next) {
        User.findOne({
            username: request.user.username
        }, (error, user) => {
            if (error || user === null) {
                response.sendStatus(400)
            } else {
                next()
            }
        })
    }

    return {
        registerHandler: [jsonParser, registerRespondent],
        // Passport is looking for fields 'username' and 'password'
        // in the json provided and this is exactly what we are
        // sending from client. See http://passportjs.org/docs > Parameters.
        loginHandler: [jsonParser, passport.authenticate('local'),
            loginRespondent
        ],
        jwtProtector: [jwtValidator, userValidator]
    }
}

module.exports = initialize
