const emitter_1 = require("./emitter");
const sender_1 = require("./sender");
const {PacketType, Encoder, Decoder} = require('./parser');
const {hasBinary} = require('./common');

const encoder = new Encoder();

class Socket extends emitter_1.Emitter {
    constructor(ws, server, path, data, ip) {
        super();
        
        let decoder = new Decoder();
        
        this.id = crypto.randomUUID().replace(/-/g, '');
        this.connected = false;
        this.path = path;
        this.remoteAddress = ip;
        this.data = data;
        this.ws = ws;
        this.server = server;
        this._decoder = decoder;
        
        decoder.on('decoded', (packet) => {
            //console.log('decoder add');
            //console.log(packet);
            let data = packet.data
            switch (packet.type) {
                case PacketType.CONNECT:
                    this._onConnect(data);
                    break;
                case PacketType.EVENT:
                case PacketType.BINARY_EVENT:
                    let reservedEvents = ['error','connect','disconnect'];
                    
                    if (reservedEvents.includes(data[0])) {
                        return this.event('error', new Error('Cannot emit reserved event: ' + data[0]));
                    }
                    this.event(...data);
                    break;
                    
                default:
                    this.event('error', new Error('Unknown packet type: ' + packet.type))
            }
        })
        
        this._setup(ws);
    }
    _setup(ws) {
        ws.on('message', (data, isBinary) => {
            if (!isBinary) {
                data = data.toString('utf-8');
                try {
                    data = JSON.parse(data);
                    this._decoder.add(data)
                } catch(err) {
                    this._decoder.add(data)
                }
            } else {
                this._decoder.add(data)
            }
        });
        
        ws.on('error', (err) => { //fatal?
            this.emit('error', err);
        });
        
        ws.once('close', (code,reason) => {
            //1001 - Page or browser closed
            //1005 - WebSocket.close() called
            let router = this.server.routers.get(this.path);
            
            router.sockets.delete(this.id);
            this.connected = false;
            this.ws = null;
            this.server = null;
            this.remoteAddress = null;
            this.data = null;
            
            this.event('disconnect');
            this.off();
        });
        //CONNECT PAYLOAD IS ARRAY
        this._send({
            type: PacketType.CONNECT,
            data: [this.id, this.data]
        })
    }
    _onConnect(data) {
        if (data[0] && data[0].length) { //CLIENT SENT ITS PREVIOUS ID, USE IT
            this.id = data[0]
        }
        this.connected = true;
        this.event('connect');
    }
    to(target) {
        let router = this.server.routers.get(this.path);
        
        if (!target) {
            return new sender_1.Sender(router.sockets.values());
        }
        if (typeof target === 'string') {
            target = [target];
        }
        if (Array.isArray(target)) {
            let sockets = new Set();
            
            for (let id of target) {
                if (router.sockets.has(id)) sockets.add(router.sockets.get(id));
            }
            return new sender_1.Sender(sockets);
        }
    }
    
    //SEND DATA (UNFORMATTED)
    emit(...args) {
        if (typeof args[0] !== 'string') {
            return this.event('error', new Error('Event must be a string'))
        }
        //console.log(args);
        this._send({
            type: hasBinary(args) ? PacketType.BINARY_EVENT : PacketType.EVENT,
            data: args
        });
    }
    
    //ENCODES SENDS PACKET (FORMATTED)
    _send(packet) {
        let encoded = encoder.encode(packet);
        
        for (let chunk of encoded) {
            if (Object.prototype.toString.call(chunk) === '[object Object]') {
                try {chunk = JSON.stringify(chunk);} catch(err) { }
            }
            
            this.ws.send(chunk, {
                binary: hasBinary(chunk) ? true : false
            });
        }
    }
    //EMIT TO MULTIPLE RECIPIENTS
    cast(...args) {
        let id = this.id
            , sockets = this.server.routers.get(this.path).sockets;
        
        for (let [sid, socket] of sockets) {
            if (id == sid) continue;
            socket.emit(...args);
        }
    }
    close() {
        if (this.connected) {
            this.ws.close();
        }
    }
}

exports.Socket = Socket;