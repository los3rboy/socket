let debug = console.log
    , router_1 = require('../router');

    let http = require('node:http');
    let router = new router_1.Router('/websocket');

    router.on('connection', (socket) => {
        debug(socket.id + ' foi conectado');

        socket.on('message', (data, to) => {
            debug(data);
            if (to) {
                return router.to(to).emit('message', data, socket.id);
            } else {
                socket.cast('message', data, socket.id);
            }
        });
        
        socket.on('error', debug);

        socket.on('disconnect', () => {
            debug(socket.id + ' foi desconectado');
            router.emit('leave', socket.id)
        })
        
        //CUSTOM (DEVELOPER) EVENTS 
        socket.cast('join', {
            id: socket.id,
            firstName: socket.data.firstName
        });

        //TELL ME ABOUT THE OTHERS
        
        for (let [id, otherSocket] of router.sockets) {
            if (socket.id !== id) {
                socket.emit('join', {
                    id: otherSocket.id,
                    firstName: otherSocket.data.firstName
                })
            }
        }
        socket.emit('message', 'Olá socket!');
    })