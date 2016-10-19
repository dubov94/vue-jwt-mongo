'use strict';

var bodyParser = require('body-parser');
var jsonwebtoken = require('jsonwebtoken');
var expressJwt = require('express-jwt');
var mongoose = require('mongoose');
var passport = require('passport');
var passportLocalMongoose = require('passport-local-mongoose');
var merge = require('merge');

function initializeExpressMiddlewares(options) {
    options = merge({
        userModelName: 'User',
        jwtExpiresIn: 7 * 24 * 60 * 60
    }, options);

    // See http://mongoosejs.com/docs/promises.html.
    mongoose.Promise = global.Promise;

    // Create empty schema that is going to be used
    // by passport-local-mongoose.
    var UserSchema = new mongoose.Schema();
    // Now a corresponding model will have methods
    // such as createStrategy() and serializeUser().
    UserSchema.plugin(passportLocalMongoose);

    // Create a separate connection leaving the
    // possibility of using mongoose.connect() open.
    var database = mongoose.createConnection(options.mongoUrl, function (error) {
        if (error) {
            /* istanbul ignore next */
            throw error;
        }
    });
    var User = database.model(options.userModelName, UserSchema);

    // We are following https://github.com/saintedlama/passport-local-mongoose
    // > Simplified Passport Configuration.
    passport.use(User.createStrategy());
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());

    var jsonParser = bodyParser.json();
    // Endpoints with this middleware provided check the token for validity
    // and set request.user dictionary to payload.
    var jwtValidator = expressJwt({
        secret: options.jwtSecret
    });

    function generateToken(username) {
        return jsonwebtoken.sign({ username: username }, options.jwtSecret, {
            expiresIn: options.jwtExpiresIn
        });
    }

    function loginRespondent(request, response) {
        response.send(generateToken(request.body.username));
    }

    function registerRespondent(request, response) {
        User.register(new User({
            username: request.body.username
        }), request.body.password, function (error) {
            if (error) {
                response.sendStatus(400);
            } else {
                response.sendStatus(200);
            }
        });
    }

    function refreshRespondent(request, response) {
        response.send(generateToken(request.user.username));
    }

    function userValidator(request, response, next) {
        User.findOne({
            username: request.user.username
        }, function (error, user) {
            if (error || user === null) {
                response.sendStatus(400);
            } else {
                return next();
            }
        });
    }

    var jwtProtector = [jwtValidator, userValidator];

    return {
        registerHandler: [jsonParser, registerRespondent],
        // Passport is looking for fields 'username' and 'password'
        // in the json provided and this is exactly what we are
        // sending from client. See http://passportjs.org/docs > Parameters.
        loginHandler: [jsonParser, passport.initialize(), passport.authenticate('local'), loginRespondent],
        refreshHandler: [jwtProtector, refreshRespondent],
        jwtProtector: jwtProtector
    };
}

module.exports = {
    Server: initializeExpressMiddlewares
};