# Vue! Jwt! Mongo!
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/dubov94/vue-jwt-mongo/blob/master/LICENSE)
[![Dependencies](https://david-dm.org/dubov94/vue-jwt-mongo.svg)](https://david-dm.org/dubov94/vue-jwt-mongo)
[![Build](https://travis-ci.org/dubov94/vue-jwt-mongo.svg?branch=master)](https://travis-ci.org/dubov94/vue-jwt-mongo)
[![Coverage](https://codecov.io/gh/dubov94/vue-jwt-mongo/branch/master/graph/badge.svg)](https://codecov.io/gh/dubov94/vue-jwt-mongo)

## Server

```javascript
const app = require('express')()

const vjmServer = require('vue-jwt-mongo').Server({
  mongoUrl: 'mongodb://localhost/db',
  jwtSecret: 'shhh'
})

app.post('/auth/register', vjmServer.registerHandler)
app.post('/auth/login', vjmServer.loginHandler)
app.get('/protected', vjmServer.jwtProtector, (request, response) => {
    console.log(request.user.username)
})
```

## Client

```javascript
this.$auth.register('login', 'pass', successCallback, errorCallback)
this.$auth.logIn('login', 'pass', successCallback, errorCallback)
this.$auth.isLoggedIn()
this.$auth.logOut()
```

```javascript
this.$http.get('/protected', { bearer: true }, successCallback, errorCallback)
```
