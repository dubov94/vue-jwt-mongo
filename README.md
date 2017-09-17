# Vue! Jwt! Mongo!
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/dubov94/vue-jwt-mongo/blob/master/LICENSE)
[![Dependencies](https://david-dm.org/dubov94/vue-jwt-mongo.svg)](https://david-dm.org/dubov94/vue-jwt-mongo)
[![Build](https://travis-ci.org/dubov94/vue-jwt-mongo.svg?branch=master)](https://travis-ci.org/dubov94/vue-jwt-mongo)
[![Coverage](https://codecov.io/gh/dubov94/vue-jwt-mongo/branch/master/graph/badge.svg)](https://codecov.io/gh/dubov94/vue-jwt-mongo)

This [package](https://www.npmjs.com/package/vue-jwt-mongo) is aimed for bootstrapping a simple JSON Web Token based authentication system using [Vue.js](https://vuejs.org/), [MongoDB](https://www.mongodb.com/) and [Express.js](https://expressjs.com/).

## Installation
```bash
npm install vue-jwt-mongo --save
```

## Server
```javascript
const app = require('express')()

const vjmServer = require('vue-jwt-mongo').Server({
  mongoUrl: 'mongodb://localhost/db',
  jwtSecret: 'shhh'
})
```

### Options
* `mongoUrl` (mandatory): address of Mongo database. Used for [`mongoose.createConnection`](http://mongoosejs.com/docs/api.html#index_Mongoose-createConnection).
* `jwtSecret` (mandatory): secret key for tokens generation. Used for [`jsonwebtoken.sign`](https://www.npmjs.com/package/jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback). You can get one [here](https://www.grc.com/passwords.htm).
* `userModelName`: name of [mongoose](http://mongoosejs.com) model that is used for storing encoded user credentials. Defaults to `User`.
* `jwtExpiresIn`: tokens expiration time in seconds. Used for [`jsonwebtoken.sign`](https://www.npmjs.com/package/jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback). Defaults to one week.

### Registration
* __Request:__ `{ username, password }`
* __Response:__ &empty;

A password is salted and hashed via [`passport-local-mongoose`](https://npmjs.com/package/passport-local-mongoose).
```javascript
app.post('/auth/register', vjmServer.registerHandler)
```

### Login
* __Request:__ `{ username, password }`
* __Response:__ JSON Web Token

```javascript
app.post('/auth/login', vjmServer.loginHandler)
```

### Refresh
* __Request:__ &empty;, [`Authorization`](https://developer.mozilla.org/en/docs/Web/HTTP/Headers/Authorization)
* __Response:__ JSON Web Token

```javascript
app.post('/auth/refresh', vjmServer.refreshHandler)
```

### Protector
* __Request:__ &forall;, [`Authorization`](https://developer.mozilla.org/en/docs/Web/HTTP/Headers/Authorization)

```javascript
app.get('/protected', vjmServer.jwtProtector, (request, response) => {
    console.log(request.user.username);
})
 ```

## Client
```javascript
Vue.use(require('vue-resource'))
Vue.use(require('vue-jwt-mongo').Client, { /* options */ })
```

### Options
* `registerEndpoint`: server endpoint for registration. Defaults to `/auth/register`.
* `loginEndpoint`: server endpoint for authentication. Defaults to `/auth/login`.
* `refreshEndpoint`: server endpoint for token refresh. Defaults to `/auth/refresh`.
* `storageKey`: localStorage key used for saving a token. Defaults to `jsonwebtoken`.
* `bearerLexem`: a lexem prepending tokens in Authorization headers. Defaults to `Bearer `.

### Requests
All of the following requests return [vue-resource](https://github.com/pagekit/vue-resource) Promises, so you can get the idea of callbacks structure [here](https://github.com/pagekit/vue-resource/blob/master/docs/http.md#example).

### Authentication
```javascript
this.$auth.register('login', 'password')
```
```javascript
this.$auth.logIn('login', 'password')
```
```javascript
this.$auth.refresh()
```

### Authorization
If `bearer: true` is passed then `Authorization: Bearer {token}` [header](https://developer.mozilla.org/en/docs/Web/HTTP/Headers/Authorization) is added.

```javascript
this.$http.get('/protected', { bearer: true }).then(response => {
    console.log(response)
})
```

### Token
#### isLoggedIn
* __Type:__ `boolean`

Returns `true` if the saved token is valid and `false` otherwise.

```javascript
let isLoggedIn = this.$auth.isLoggedIn()
```

#### getToken
* __Type:__ JSON Web Token | `null`

Returns a string if the saved token is valid and `null` otherwise.

```javascript
this.$auth.getToken()
```

#### logOut
Purges the saved token.

```javascript
this.$auth.logOut()
```

