import {Emitter} from './emitter.js';
import {typeOf, hasBinary } from './common.js'
import {PacketType} from './parser.js'
import {Transport} from './transport.js'

export class Socket extends Emitter {
    constructor(path, options = {}){
        super();
        
        let _this = this;
        
        _this.id = '';
        _this.state = 'connecting';
        _this.transport = null;
        _this._createTransport(path, options) //options
        _this.data = {};
        
    }
    _createTransport(path, options) {
        let transport = new Transport(path, options)
            , interval = null
            , _this = this;
            
        //TODO: RECONNECTION
        transport.on('open', () => {
            clearInterval(interval)
            _this.transport = transport;
        });
        
        transport.on('packet', packet => {
            let data = packet.data;
            switch (packet.type) {
                case PacketType.CONNECT:
                    _this._onConnect(data)
                    break;
                case PacketType.EVENT:
                case PacketType.BINARY_EVENT:
                    let reservedEvents = 'error connect disconnect';
                    
                    if (reservedEvents.includes(data[0])) {
                        return _this.event('error', new Error('Cannot emit reserved event: ' + data[0]));
                    }
                    _this.event(...data);
                    break;
                
                default:
                    _this.event('error', new Error('Unknown packet type: ' + packet.type))
            }
        });
        
        transport.on('error', err => {//Analyze errors
            let computedDelay = 2500 + Math.floor(Math.random() * (5000 - 2500 + 1));
			
            switch (err.code) {
                case 'transport_error':
                case 'server_error':
                case 'protocol_error':
                case 'request_error': //SOMETHING WENT WRONG, TRY TO RECONNECT:
                    _this.event('error', err);
                    interval = setInterval(() => {
                        clearInterval(interval);
                        _this._createTransport(path, options);
                    }, computedDelay);
                    break;
                default://CONNECTION_ERROR, WRITE_ERROR
                    _this.event('error', err)
            }
        });
        
        transport.on('close', () => {//RELEASE RESOURCES 
            _this.state = 'disconnected';
            _this.transport = null;
            _this.data = null;
            _this.event('disconnect');
            _this.off()
        });
    }
    _onConnect(data) {
        let _this = this, id = _this.id;
        //1 - if my id is not set, then set it:
        if (!id.length) {
            _this.id = data[0]; //semote socket id
        }
        _this.transport.send({
            type: PacketType.CONNECT,
            data: [id]
        })
        //then save received data
        _this.data = data[1]; //ANY DATA COMING FROM SERVER (USERID, ETC)
        //and update state
        _this.state = 'connected';
        _this.event('connect')
    }
    
    emit(...args) {
        if (!typeOf(args[0], 'string')) {
            return this.event('error', new Error('Event must be a string'))
        }
        
        this.transport.send({
            type: hasBinary(args) ? PacketType.BINARY_EVENT : PacketType.EVENT,
            data: args
        });
    }
    
    close(code = 1000) {
        this.transport.close(code);
    }
    get connected() {
        return this.transport.open;
    }
}
