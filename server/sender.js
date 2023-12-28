class Sender {
    constructor(sockets) {
        this.sockets = new Set(sockets);
    }
    emit(...args) {
        if (!args[0]) return false;
        
        for (let socket of this.sockets) {
            socket.emit(...args);
        }
    }
}

exports.Sender = Sender;