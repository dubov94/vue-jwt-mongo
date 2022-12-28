# vue-jwt-mongo

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/dubov94/vue-jwt-mongo/blob/master/LICENSE)
[![Coverage](https://codecov.io/gh/dubov94/vue-jwt-mongo/branch/master/graph/badge.svg)](https://codecov.io/gh/dubov94/vue-jwt-mongo)

A [package](https://www.npmjs.com/package/vue-jwt-mongo) for bootstrapping a simple [JSON Web Token](https://jwt.io/)-based authentication system using [Vue.js](https://vuejs.org/), [MongoDB](https://www.mongodb.com/) and [Express.js](https://expressjs.com/).

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

* `mongoUrl` (__mandatory__): an address of the Mongo database.
  * See [`mongoose.createConnection`](http://mongoosejs.com/docs/api.html#index_Mongoose-createConnection) for details.
* `jwtSecret` (__mandatory__): a secret key for token generation.
  * One can get such a key [here](https://www.grc.com/passwords.htm).
  * See [`jsonwebtoken.sign`](https://www.npmjs.com/package/jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback) for details.
* `userModelName`: a name for the [mongoose](http://mongoosejs.com) model storing encoded user credentials.
  * Defaults to `'User'`.
* `jwtExpiresIn`: token expiration time in seconds.
  * Defaults to `7 * 24 * 60 * 60` (one week).
  * See [`jsonwebtoken.sign`](https://www.npmjs.com/package/jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback) for details.

### Endpoints

#### registerHandler

Expects `{ username, password }` in the request body. Returns an empty response.

The password is salted and hashed via [passport-local-mongoose](https://npmjs.com/package/passport-local-mongoose).
```javascript
app.post('/auth/register', vjmServer.registerHandler)
```

#### loginHandler

Expects `{ username, password }` in the request body. Returns a string &mdash; the token.

```javascript
app.post('/auth/login', vjmServer.loginHandler)
```

#### refreshHandler

Expects an empty request body and `Authorization: Bearer {token}` as one of the HTTP headers. Returns a string with a new token if the original token is valid.

```javascript
app.post('/auth/refresh', vjmServer.refreshHandler)
```

### Protector

`jwtProtector` ensures that the incoming request has a valid token. Expects `Authorization: Bearer {token}` as one of the HTTP headers.

```javascript
app.get('/protected', vjmServer.jwtProtector, (request, response) => {
    console.log(request.user.username)
})
 ```

## Client

```javascript
Vue.use(require('vue-resource'))
Vue.use(require('vue-jwt-mongo').Client, {
  /* options, if any */
})
```

### Options

* `registerEndpoint`: the server's endpoint for registration requests.
  * Defaults to `'/auth/register'`.
* `loginEndpoint`: the server's endpoint for authentication requests.
  * Defaults to `'/auth/login'`.
* `refreshEndpoint`: the server's endpoint for refreshing the token.
  * Defaults to `'/auth/refresh'`.
* `storageKey`: a [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) key used for saving the token.
  * Defaults to `'jsonwebtoken'`.
* `bearerLexem`: a lexem prepending tokens in [`Authorization`](https://developer.mozilla.org/en/docs/Web/HTTP/Headers/Authorization) headers.
  * Defaults to `'Bearer '` (extra space intended).

### Requests

### Authentication

All of the following requests return [vue-resource](https://github.com/pagekit/vue-resource) Promises, so one can get an idea of the callback structure [here](https://github.com/pagekit/vue-resource/blob/master/docs/http.md#response).

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
If `bearer: true` is passed then `Authorization: Bearer {token}` is added as a [header](https://developer.mozilla.org/en/docs/Web/HTTP/Headers/Authorization).

```javascript
this.$http.get('/protected', { bearer: true }).then(response => {
    console.log(response)
})
```

### Token

#### isLoggedIn

Returns `true` if the saved token is valid and `false` otherwise.

```javascript
let isLoggedIn = this.$auth.isLoggedIn()
```

#### getToken

Returns a string if the saved token is valid and `null` otherwise.

```javascript
this.$auth.getToken()
```

#### logOut

Purges the saved token.

```javascript
this.$auth.logOut()
```

