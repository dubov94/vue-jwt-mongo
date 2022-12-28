'use strict'

const bodyParser = require('body-parser')
const { expressjwt: expressJwt } = require('express-jwt')
const jsonwebtoken = require('jsonwebtoken')
const merge = require('merge')
const mongoose = require('mongoose')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')

function initializeExpressMiddlewares(options) {
    options = merge({
        userModelName: 'User',
        jwtExpiresIn: 7 * 24 * 60 * 60
    }, options)

    // See http://mongoosejs.com/docs/promises.html.
    mongoose.Promise = global.Promise

    // Create an empty schema to be used by passport-local-mongoose.
    const UserSchema = new mongoose.Schema()

    // Now the corresponding model will have additional methods such as
    // `createStrategy` and `serializeUser`.
    UserSchema.plugin(passportLocalMongoose)

    // Create a separate connection. This way clients may still use the default
    // `mongoose.connect`.
    const database = mongoose.createConnection(
        options.mongoUrl,
        {},
        (error) => {
            if (error) {
                /* istanbul ignore next */
                throw error
            }
        }
    )

    const User = database.model(options.userModelName, UserSchema)

    // https://github.com/saintedlama/passport-local-mongoose#simplified-passportpassport-local-configuration.
    passport.use(User.createStrategy())
    passport.serializeUser(User.serializeUser())
    passport.deserializeUser(User.deserializeUser())

    const jsonParser = bodyParser.json()

    // `jwtValidator` ensures that the token from 'Authorization' header is
    // valid and populates `request.auth`.
    const jwtValidator = expressJwt({
        secret: options.jwtSecret,
        algorithms: ['HS256']
    })

    const generateToken = (username) => {
        return jsonwebtoken.sign({ username }, options.jwtSecret, {
            expiresIn: options.jwtExpiresIn
        })
    }

    const registerRespondent = (request, response) => {
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

    const loginRespondent = (request, response) => {
        response.send(generateToken(request.body.username))
    }

    const refreshRespondent = (request, response) => {
        response.send(generateToken(request.user.username))
    }

    const userValidator = (request, response, next) => {
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

    // To preserve backward compatibility, see
    // https://github.com/auth0/express-jwt#migration-from-v6.
    const copyAuthToUser = (request, response, next) => {
        request.user = request.auth
        next()
    }

    const jwtProtector = [
        function(request, response, next) {
            jwtValidator(request, response, function(error) {
                if (error !== undefined && error.name === 'UnauthorizedError') {
                    response.sendStatus(401)
                } else {
                    next(error)
                }
            })
        },
        copyAuthToUser,
        userValidator
    ]

    return {
        registerHandler: [jsonParser, registerRespondent],
        // Note that passport-local is looking for fields named 'username' and
        // 'password' in the payload, see
        // http://www.passportjs.org/docs/username-password/#parameters.
        loginHandler: [
            jsonParser,
            passport.initialize(),
            passport.authenticate('local'),
            loginRespondent
        ],
        refreshHandler: [jwtProtector, refreshRespondent],
        jwtProtector
    }
}

module.exports = {
    Server: initializeExpressMiddlewares
}
