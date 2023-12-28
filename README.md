<p align="center"><img width="200" height="70" src="https://raw.github.com/los3rboy/socket/main/socket-logo.png" /></p>

[![npm](http://img.shields.io/npm/v/@los3rboy/socket.svg)](https://www.npmjs.com/package/@los3rboy/socket)
[![release](https://img.shields.io/github/release/los3rboy/socket.svg)](https://github.com/los3rboy/socket)
[![license](http://img.shields.io/npm/l/@los3rboy/socket.svg)](https://github.com/los3rboy/socket/blob/main/LICENSE)

> © 2023-2024, Elcidio Atianor ([@los3rboy](https://github.com/los3rboy)). MIT License.

# A small, fast & clean Socket.io like WebSocket library for Node.js and the browser

Modern web application use a bunch of libraries. As we add more libraries, the size of the application increases.
In my opinion, libraries that make simple tasks shouldn't take much space in our application. 
This WebSocket library is here to solve that issue, yet keeping the basic features available in many popular libraries
Our focus is on *size*, *speed* and easy *integration* with available Node.js server frameworks

### Core Features

- Small, only 6.0 Kb minified and 2.4 Kb gzipped (client) & 19.4 Kb (server)
- Simple, clean API (inspired on Socket.io & Express)
- Uses pure **WebSocket** transport (no polling or EventSource)
- Gives you full controll over request **authentication** or **upgrade** logic
- Supports **reconnection** and message **broadcasting**.
- No **silent** errors.
- **Fast**.
- Brutally **tested**.
- Write your code using latest ECMAScript syntax & features

## Installation

With [**npm**](https://www.npmjs.com/package/@los3rboy/socket):
```js
npm i @los3rboy/socket --save
```  

## Guide

```js
//Node.js
const {Sever, Router} = require('@los3rboy/socket');

// or:
import {Sever, Router} from '@los3rboy/socket';

//Client
import {Socket} from '@los3rboy/socket/dist/socket.esm.min.js';

// or:
<script src='/node_modules/@los3rboy/socket/dist/socket.umd.min.js></script>
```

### Basic Example

Create a server and a router to listen fo connections on [/socket](ws://localhost:3000/socket).
```js
//Server
const http = require('node:http');
const {Server, Router} = require('@los3rboy/socket');

const httpServer = http.createServer((req, res) => {
    //some smart code
})

//create a simple authentication/upgrade function (your own)
function authRequest(req, netSocket, done) {
    //do some authentication tasks here and get some data useful for your application 
    let cookies = cookie.parse(req.headers['cookie'])
    let jwtToken = cookies['jwt'];
    
    if (!jwtToken) return done(new Error('Failed to get authentication token from cookie'))
    jwt.verify(jwtToken, process.env.JWT_SECRET, jwtOptions, (err, payload) => {
        //pass an error abort request upgrade
        if (err) return done(err);
            User.findOne({ username: payload.username })
                .then(user => {
                    let {firstName, lastName} = user;
                    //any data useful for your application (pass as second argument)
                    done(null, {firstName, lastName});
                })
                .catch(done)
        });
}

//create a Socket server
const server = new Socket(httpServer, {
    //pass your auth/upgrade function here 
    onSocketUpgrade: authRequest
})

//create a simple router
const router = new Router();

//listen to some events
router.on('connection', (socket) => {
    //listen to custom events
    socket.on('answer', (answer) => {
        console.log('Client said: ' + answer);
    })
    socket.on('another event', (...args) => {
        //another action
    })
    
    //or internal events...
    socket.on('error', (err) => {
        //take actions
    })
    
    //sending events to the client
    socket.emit('greeting', 'Hello socket!'); //to socket
    socket.cast('anouncement', 'Hey buddies, I greet you all!'); //to another sockets
    socket.to('someSocketId').emit('private message', 'Hi buddy!'); //to a specific socket
    socket.to('/routeOrPath').emit('anouncement', 'Hu ho!'); //to a specific route or path
})

//let router listen to socket connections
//e.g. ws://localhost:3000/socket
server.use('/socket', router);
server.use('/another_path', anotherOrSameRouter);

//start your server
httpServer.listen(3000)
```

### Client Example

Assuming you've already loaded the client-side socket:

```js
const socket = new Socket('wss://localhost:3000/socket'); //or simply /socket
// ...
socket.on('connect', () => {
    //start emiting events
})

socket.on('greeting', (greeting) => {
    console.log(greeting);
    socket.emit('answer', 'Hello server!');
})

socket.emit('another event', ...args)
socket.close()
```

### Routers

Create routers to listen to connections on specific path by the router constructor
- Routers can emit & broadcast events to sockets or another routes
- Routers can not listen to custom events (emitted by client sockets)

```js
// router send & broadcast events
router.emit('greeting', 'Hello all sockets!'); //to all socket in this route
router.to('someSocketId').emit('private message', 'Hi buddy!'); //to a specific socket
router.to('/routeOrPath').emit('anouncement', 'Hu ho!'); //to a specific route or path
```

## Documentation

You can read the full [**API reference**][docs] with lots of details, features and examples.  
And more at the [F.A.Q. section][faq].

## Change-Log

See [CHANGELOG][changelog].

## Contributing

Clone original project:

```sh
git clone https://github.com/los3rboy/socket.git
```

Install dependencies:

```sh
npm install
```

Add tests to relevant file under [/test](test/) directory and run:  

```sh
npm run build && npm run test
```

## License

[**MIT**][license].

[changelog]:https://github.com/los3rboy/socket/blob/main/CHANGELOG.md
[license]:https://github.com/los3rboy/socket/blob/main/LICENSE
