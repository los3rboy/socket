const ws_1 = require("ws");
const emitter_1 = require("./emitter");
const socket_1 = require("./socket");
const router_1 = require("./router");
const sender_1 = require("./sender");
const url = require('url');

class Server extends emitter_1.Emitter {
    constructor(httpServer, options = {}) {
        super();
        
        options = Object.assign({
            noServer: true,
            clientTracking: false
        }, options);
        
        this.routers = new Map();
        this.httpServer = httpServer;
        this.wss = null;
        
        let wss = new ws_1.Server(options);
        
        httpServer.on('upgrade', (req, netSocket, head) => {
            let path = url.parse(req.url).path || '/';
            let router = this.routers.get(path);
            
            if (!router) {
                this.emit('error', new Error('No handler for this route'));
                netSocket.write('HTTP/1.1 500 Server upgrade error\r\n\r\n');
                return netSocket.destroy();
            }
            /**
             * DEVELOPER-DEFINED FUNCTION TO RETRIEVE CUSTOM DATA 
             * FROM APPLICATION & AUTHENTICATION PURPOSES.
             * IF CALLBACK IS GIVEN SECOND ARGUMENT (DATA), WHICH IS GENERALLY A PLAIN OBJECT 
             * THAT DATA WILL BE SENT TO CLIENT AND KEPT IN SOCKET UNDER
             * 'DATA' KEY. THE SAME DATA WILL ALSO BE KEPT IN SERVER SOCKET! VIOLA!
             */
            options.authRequest(req, netSocket, (err, data) => {
                if (err) {
                    console.log(err);
                    this.event('error', new Error('Request upgrade error: ' + err.message));
                    netSocket.write('HTTP/1.1 401 Request upgrade error\r\n\r\n');
                    return netSocket.destroy();
                }
                
                wss.handleUpgrade(req, netSocket, head, (ws) => {
                    if (data === undefined) data = {}
                    
                    let ip = req.socket.remoteAddress
                        , socket = new socket_1.Socket(ws, this, path, data, ip);
                        
                    socket.on('connect', () => {
                        router.sockets.set(socket.id, socket);
                        router.event('connection', socket);
                        this.event('connection', socket);
                    })
                    //this.sockets.set(socket.id, socket);
                })
            })
            
        });
        
        //wss.on('headers', (headers) => {});
        //wss.on('wsClientError', () => {});
        wss.on('error', (err) => {
            this.event('error', err);
        });
        
        wss.on('close', () => {
            this.routers = null;
            this.httpServer = null;
            this.wss = null;
            
            this.event('close');
        });
        
        this.wss = wss;
    }
    
    use(path, router) {
        if (!path) throw new TypeError('Either a router or both path and router must be provided')
        if (path instanceof router_1.Router) path = '/'
        if (this.routers.has(path)) {
            throw new TypeError(`Duplicate route '${path}'`);
        }
        
        router.path = path;
        router.server = this;
        this.routers.set(path, router);
    }
    /**
     * @param {string | string[]} target - Route or routes to send to
     */
    to(target) {
        if (typeof target === 'string') {
            target = [target];
        }
        
        if (Array.isArray(target)) {
            let sockets = new Set();
            
            for (let route of target) {
                if (this.routers.has(route)) {
                    for (let socket of this.routers.get(route).sockets) {
                        sockets.add(socket);
                    }
                }
            }
            
            return new sender_1.Sender(sockets);
        }
    }
    
    emit(...args) {
        if (!args[0]) throw new TypeError('No data or invalid data was provided');
        
        for (let [id, router] of this.routers) {
            router.emit(...args);
        }
    }
    close() {
        
    }
}

exports.Server = Server;