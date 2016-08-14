'use strict'

module.exports = function(options) {
    const bodyParser = require('body-parser')
    const jsonwebtoken = require('jsonwebtoken')
    const expressJwt = require('express-jwt')
    const mongoose = require('mongoose')
    const passport = require('passport')
    const passportLocalMongoose = require('passport-local-mongoose')
    const merge = require('merge')

    options = merge({
        userModelName: 'User',
        jwtExpiresIn: 7 * 24 * 60 * 60
    }, options)

    // See http://mongoosejs.com/docs/promises.html.
    mongoose.Promise = global.Promise

    // Create empty schema that is going to be used
    // by passport-local-mongoose.
    const UserSchema = new mongoose.Schema()
    // Now a corresponding model will have methods
    // such as createStrategy() and serializeUser().
    UserSchema.plugin(passportLocalMongoose)

    // Create a separate connection leaving the
    // possibility of using mongoose.connect() open.
    const database = mongoose.createConnection(options.mongoUrl, (error) => {
        if (error) {
            /* istanbul ignore next */
            throw error
        }
    })
    const User = database.model(options.userModelName, UserSchema)

    // We are following https://github.com/saintedlama/passport-local-mongoose
    // > Simplified Passport Configuration.
    passport.use(User.createStrategy())
    passport.serializeUser(User.serializeUser())
    passport.deserializeUser(User.deserializeUser())

    const jsonParser = bodyParser.json()
    // Endpoints with this middleware provided check the token for validity
    // and set request.user dictionary to payload.
    const jwtValidator = expressJwt({
        secret: options.jwtSecret
    })

    function loginRespondent(request, response) {
        let token = jsonwebtoken.sign({
            username: request.body.username
        }, options.jwtSecret, {
            expiresIn: options.jwtExpiresIn
        })
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
                return next()
            }
        })
    }

    return {
        registerHandler: [jsonParser, registerRespondent],
        // Passport is looking for fields 'username' and 'password'
        // in the json provided and this is exactly what we are
        // sending from client. See http://passportjs.org/docs > Parameters.
        loginHandler: [
            jsonParser, passport.initialize(),
            passport.authenticate('local'), loginRespondent
        ],
        jwtProtector: [jwtValidator, userValidator]
    }
}
