const emitter_1 = require('./emitter');
const sender_1 = require('./sender');

class Router extends emitter_1.Emitter {
    constructor() {
        super();
        
        this.path = '/';
        this.sockets = new Map(); //Map<Strig<ID>, Set<Socket>>
        this.server = null;
    }
    
    /**
     * Sends data to all clients in this router
     */
    emit(...args) {
        if (!args[0]) return false;
        
        for (let [id, socket] of this.sockets) {
            socket.emit(...args);
        }
    }
    /**
     * Send data to a set af Sockets or to all sockets on this route (when no target)
     * @param {string | string[]} target - Socket ID or IDs
     */
    to(target) {
        let sockets = new Set();
        if (typeof target === 'string') {
            target = [target];
        }
        if (Array.isArray(target)) {
            for (let id of target) {
                if (this.sockets.has(id)) {
                    sockets.add(this.sockets.get(id));
                }
            }
            return new sender_1.Sender(sockets);
        }
    }
    close() {
        for (let [,socket] of this.sockets) {
            socket.close();
        }
    }
}

exports.Router = Router;