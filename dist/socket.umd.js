(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Socket = factory());
})(this, (function () { 'use strict';

    let e = Symbol('e');

    class Emitter {
        constructor(){
            this[e] = new Map();
        }
        on(key, cb){
            let map = this[e];
            
            if (!map.has(key)) map.set(key, new Set());
            map.get(key).add(cb);
            return this;
        }
        event(key, ...args) {
            let _this = this, map = _this[e];
            
            if (map.has(key)) {
                for (let cb of map.get(key)) {
                    cb.apply(_this, args);
                }
            }
            return _this;
        }
        emit(key, ...args) {
            return this.event(key, ...args)
        }
        once(key, cb) {
            let _this = this, _cb = (...args) => {
                cb.apply(_this, args);
                _this.off(key, _cb);
            };
            _this.on(key,_cb);
            return _this;
        }
        off(key, cb){
            let _this = this, map = _this[e]
              , callbacks = map.get(key);
            
            if (!key) return _this[e].clear(); //No args, remove all
            if (!cb) return _this[e].delete(key); //No callback, remove all listeners for this event
            if (callbacks) {
                callbacks.delete(cb);
                if (!callbacks.size) map.delete(callbacks);
            }
            return _this
        }
    }

    let instOf = (constructor, obj) => obj instanceof constructor
    , typeOf = (obj, type) => typeof obj === type
    , isArray = Array.isArray
    , hasOwn = (key, obj) => obj.hasOwnProperty(key)
    , isBinary = (obj) => {
            let AB = ArrayBuffer, isView = AB.isView;
            return isView && isView(obj) || instOf(AB, obj) || instOf(AB, obj.buffer) || instOf(Blob, obj) || instOf(File, obj)
        }
        , hasBinary = (obj) => {
        if (!typeOf(obj, 'object')) {
            return false
        }
        if (isBinary(obj)) {
            return true
        }
        if (isArray(obj)) {
            for (let _obj of obj) {
                if (hasBinary(_obj)) {
                    return true
                }
            }
            return false
        }
        let toJSON = obj.toJSON;
        if (toJSON && hasBinary(toJSON())) {
            return true
        }
        
        for (let key in obj) {
            if (hasOwn(key, obj) && hasBinary(obj[key])) {
                return true
            }
        }
        return false
    };

    //ADD PING
    let PacketType = {
        0: "CONNECT",
        1: "EVENT",
        2: "BINARY_EVENT",
        "CONNECT": 0,
        "EVENT": 1,
        "BINARY_EVENT": 2,
    };

    let unpackNow = (data, buffers) => {
            if (!data)
                return data;
            if (isBinary(data)) {
                let placeholder = { _placeholder: true, num: buffers.length };
                buffers.push(data);
                return placeholder;
            }
            else if (isArray(data)) {
                let _data = new Array(data.length);
                for (let i = 0; i < data.length; i++) {
                    _data[i] = unpackNow(data[i], buffers);
                }
                return _data;
            }
            else if (typeOf(data, 'object') && !instOf(Date, data)) {
                let _data = {};
                for (let key in data) {
                    if (hasOwn(key, data)) {
                        _data[key] = unpackNow(data[key], buffers);
                    }
                }
                return _data
            }
            return data; //string
        };

    let unpack = (packet) => {
            let buffers = []
                , data = packet.data
                , copy = packet;
        
            copy.data = unpackNow(data, buffers);
            copy.binaries = buffers.length; // number of binary 'attachments'
            return { packet: copy, buffers: buffers }
        };

    let encodeAsString = (packet) => {
            //console.log('encoding as string');
            // first is type
            if (hasBinary(packet)) throw new TypeError("Packet contains binary data");
            let str = "" + packet.type;
            
            // then json data
            if (packet.data !== null) {
                str += JSON.stringify(packet.data);
            }
            return str;
        };
        
    let encodeAsBinary = (packet) => {
            if (!hasBinary(packet)) {
                throw new TypeError("Packet doesn't contain binary data")
            }
            //console.log('binary encoding');
            let unpacked = unpack(packet)
                , _packet = unpacked.packet
                , str = '' + _packet.type + _packet.binaries
                , buffers = unpacked.buffers;
            
            if (_packet.data != null) {
                str += JSON.stringify(_packet.data);
            }
            buffers.unshift(str);
            return buffers
        };
        

    class Encoder {
        encode(packet) {
            return packet.type === PacketType.BINARY_EVENT
                ? encodeAsBinary(packet)
                : [encodeAsString(packet)]
        }
    }


    let repackNow = (data, buffers) => {
            if (data && data._placeholder) {
                let indexValid = typeOf(data.num, 'number') && data.num >= 0 && data.num < buffers.length;
                if (indexValid) {
                    return buffers[data.num] // appropriate buffer (should be natural order anyway)
                }
                else {
                    throw new Error("Illegal attachments")
                }
            }
            else if (isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    data[i] = repackNow(data[i], buffers);
                }
            }
            else if (typeOf(data, 'object')) {
                for (let key in data) {
                    if (hasOwn(key, data)) {
                        data[key] = repackNow(data[key], buffers);
                    }
                }
            }
            return data
        };

    let repack = (packet, buffers) => {
        packet.data = repackNow(packet.data, buffers);
        delete packet.binaries; // no longer useful
        return packet
    };

    class Packer {
        constructor(packet) {
            let _this = this;
            _this.packet = packet;
            _this.buffers = [];
            _this.packing = packet;
        }
        
        pop(data) {
            let _this = this;
            _this.buffers.push(data);
            if (_this.buffers.length === _this.packing.binaries) {
                
                let packet = repack(_this.packing, _this.buffers);
                _this.done();
                return packet
            }
            return null
        }
        
        done() {
            this.packing = null;
            this.buffers = [];
        }
    }

    //TODO: AO REFATORAR, COMECAR DAQUI
    let isValidPayload = (type, payload) => {
        switch (type) {
            case PacketType.CONNECT:
                return isArray(payload);
                
            case PacketType.EVENT:
            case PacketType.BINARY_EVENT://[str, ...args]
                return isArray(payload) && (typeOf(payload[0], 'string'))
        }
    };

    let parse = (str) => {
        try {
            return JSON.parse(str)
        }
        catch (e) {
            return false
        }
    };

    let decode = (str) => {
        // 1 - look up type
        let header = str.match(/^[0-9]+/g)[0]
            , packet = {
                type: +header[0], //"" ==> 0
            };
        if (PacketType[packet.type] === undefined) {
            throw new TypeError("Unknown packet type " + packet.type);
        }

        // 2 - look up & determine attachments length
        if (packet.type === PacketType.BINARY_EVENT) {
            let len = +header.slice(1); //"" ==> 0

            if (!len) {
                throw new Error("Illegal attachments");
            }
            packet.binaries = len;
        }

        // 3 - look up json data
        let data = str.substr(header.length);
        if (data.length) {
            let payload = parse(data);
            //console.log(payload);
            if (isValidPayload(packet.type, payload)) {
                packet.data = payload;
            }
            else {
                throw new Error("Payload data doesn't match packet type")
            }
        }
        return packet;
    };

    class Decoder extends Emitter {
        constructor() {
            super();
            this.packer = null;
        }
        add(data) {
            let packet
                , _this = this;
            if (typeOf(data, "string")) {
                if (_this.packer) {
                    _this._clear();
                    throw new Error("Got plain text when building a packet");
                }
                
                packet = decode(data);
                
                if (packet.type === PacketType.BINARY_EVENT) {
                    _this.packer = new Packer(packet);
                    // no attachments, labeled binary but no binary data to follow
                    if (packet.binaries === 0) {
                        _this.emit("decoded", packet);
                        _this._clear();
                    }
                }
                else {
                    // non-binary full packet
                    _this.emit("decoded", packet);
                    _this._clear();
                }
            }
            else if (isBinary(data)) {
                // raw binary data
                if (!_this.packer) {
                    throw new Error("Got binary data when not building a packet");
                }
                else {
                    packet = _this.packer.pop(data);
                    if (packet) {
                        // received final buffer
                        _this.emit("decoded", packet);
                        _this._clear();
                    }
                }
            }
            else {
                throw new Error("Unknown data type: " + data)
            }
        }
        
        _clear() {
            let _this = this;
            _this.packer && _this.packer.done();
            _this.packer = null;
        }
    }

    let encoder = new Encoder();

    class Transport extends Emitter {
        constructor(path, options){ //socket options
            super();
            //
            let _this = this
                , url = /^wss?:\/\//.test(path) ? path : 'ws://' + location.host + path
                , ws = new WebSocket(url)
                , decoder = new Decoder();
                
            _this.open = false;
            
            ws.binaryType = 'arraybuffer';
            ws.onopen = () => {
                _this.open = true;
                _this.emit('open');
            };
            //FIX THIS (JOGA SERVER CLOSE MESMO
            // ANTES DA CONEXAO)
            ws.onerror = (e) => {//analizar codigo e disparar a mensagem adequada
                let error = new Error('Connection error');
                
                error.code = 'connection_error';
                _this.emit('error', error);
            };
            ws.onclose = (e) => {
                let err = new Error(), _this = this;
                switch(e.code) {
                    case 1000:
                    case 1001:
                        _this._close();
                        break;
                    case 1002:
                        err.code = 'protoclol_error';
                        err.message = 'Protocol error';
                        _this.emit('error', err);
                        break;
                    case 1006: 
                        err.code = 'server_error';
                        err.message = 'Unexpected server close';
                        _this.emit('error', err);
                        break;
                    case 1011:
                        err.code = 'request_error';
                        err.message = 'Server could not process the request';
                        _this.emit('error', err);
                        break;
                    default:
                        err.code = 'transport_error';
                        err.message = 'Transport close';
                        _this.emit('error', err);
                        
                }
            };
            
            ws.onmessage = ({data}) => {//ALL HAPPENS HERE
                _this.decoder.add(data);
            };
            
            decoder.on('decoded', packet => {
                _this.emit('packet', packet);
            });
            
            decoder.on('error', err => {
                err.code = 'decoder_error';
                _this.emit('error', err);
            });
            
            _this.ws = ws;
            _this.decoder = decoder;
            //_this.buffer = []
        }
        
        _close() {
            let _this = this, _ws = _this.ws;
            
            _this.open = false;
            _this.decoder.off();
            _this.decoder = null;
            _ws.onopen = _ws.onerror = _ws.onclose = _ws.onmessage = null;
            _this.ws = null;
            _this.emit('close');
            _this.off();
        }
        //TODO: implement send buffer, drain
        send(packet) {
            let _this = this, encoded = encoder.encode(packet);
            if (_this.open) {
                for (let chunk of encoded) {
                    if (Object.prototype.toString.call(chunk) === '[object Object]') {
                        try {data = JSON.stringify(chunk); } catch(e) {}
                    }
                    this.ws.send(chunk);
                }
            } else {
                let err = new Error('Transport not writable');
                err.code = 'write_error';
                _this.emit('error', err);
            }
        }
        
        close(code) {
            if (this.open) {
                this.ws.close(code);
            }
        }
    }

    class Socket extends Emitter {
        constructor(path, options = {}){
            super();
            
            let _this = this;
            
            _this.id = '';
            _this.state = 'connecting';
            _this.transport = null;
            _this._createTransport(path, options); //options
            _this.data = {};
            
        }
        _createTransport(path, options) {
            let transport = new Transport(path, options)
                , interval = null
                , _this = this;
                
            //TODO: RECONNECTION
            transport.on('open', () => {
                clearInterval(interval);
                _this.transport = transport;
            });
            
            transport.on('packet', packet => {
                let data = packet.data;
                switch (packet.type) {
                    case PacketType.CONNECT:
                        _this._onConnect(data);
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
                        _this.event('error', new Error('Unknown packet type: ' + packet.type));
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
                        _this.event('error', err);
                }
            });
            
            transport.on('close', () => {//RELEASE RESOURCES 
                _this.state = 'disconnected';
                _this.transport = null;
                _this.data = null;
                _this.event('disconnect');
                _this.off();
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
            });
            //then save received data
            _this.data = data[1]; //ANY DATA COMING FROM SERVER (USERID, ETC)
            //and update state
            _this.state = 'connected';
            _this.event('connect');
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

    /**
     * Used to build IIFE & UMD version of client Socket
     * Exposes Socket class globally
     * 
     */

    return Socket;

}));
