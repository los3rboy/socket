import {Socket} from './socket.mjs';

let sockets = new Map()
    , socket = new Socket('/websocket');

self.socket = socket;

let app = {
    addUser: (user) => {
        sockets.set(user.id, user);
    },
  
    removeUser: (id) => {
        sockets.delete(id);
    }
}

/** CLIENT EVENTS **/
socket.on('connect', () => {
    console.log('Socket conectado')
    socket.emit('message','Olá a todos!')
})
socket.on('disconnect', () => {
    console.log('Socket desconectado')
})

socket.on('message', (data, from) => {
    console.log(data);
});

socket.on('join', (data) => {
    console.log(data.id + ' foi conectado');
    ui.addUser(data)
});

socket.on('leave', (socketId) => {
    let user = sockets.get(socketId)
    console.log(user.firstName + ' foi desconectado');
    ui.removeUser(socketId)
});

socket.on('error', (err) => {
    console.log(err);
});
