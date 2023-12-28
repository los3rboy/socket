import { Emitter } from "./emitter.js";
import { typeOf, instOf, isArray, hasOwn, isBinary, hasBinary } from "./common.js";
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
                _data[i] = unpackNow(data[i], buffers)
            }
            return _data;
        }
        else if (typeOf(data, 'object') && !instOf(Date, data)) {
            let _data = {};
            for (let key in data) {
                if (hasOwn(key, data)) {
                    _data[key] = unpackNow(data[key], buffers)
                }
            }
            return _data
        }
        return data; //string
    }

let unpack = (packet) => {
        let buffers = []
            , data = packet.data
            , copy = packet;
    
        copy.data = unpackNow(data, buffers);
        copy.binaries = buffers.length; // number of binary 'attachments'
        return { packet: copy, buffers: buffers }
    }

let encodeAsString = (packet) => {
        //console.log('encoding as string');
        // first is type
        if (hasBinary(packet)) throw new TypeError("Packet contains binary data");
        let str = "" + packet.type;
        
        // then json data
        if (packet.data !== null) {
            str += JSON.stringify(packet.data)
        }
        return str;
    }
    
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
            str += JSON.stringify(_packet.data)
        }
        buffers.unshift(str);
        return buffers
    }
    

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
                data[i] = repackNow(data[i], buffers)
            }
        }
        else if (typeOf(data, 'object')) {
            for (let key in data) {
                if (hasOwn(key, data)) {
                    data[key] = repackNow(data[key], buffers)
                }
            }
        }
        return data
    }

let repack = (packet, buffers) => {
    packet.data = repackNow(packet.data, buffers);
    delete packet.binaries; // no longer useful
    return packet
}

class Packer {
    constructor(packet) {
        let _this = this;
        _this.packet = packet;
        _this.buffers = [];
        _this.packing = packet
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
        this.buffers = []
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
}

let parse = (str) => {
    try {
        return JSON.parse(str)
    }
    catch (e) {
        return false
    }
}

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
        packet.binaries = len
    }

    // 3 - look up json data
    let data = str.substr(header.length);
    if (data.length) {
        let payload = parse(data);
        //console.log(payload);
        if (isValidPayload(packet.type, payload)) {
            packet.data = payload
        }
        else {
            throw new Error("Payload data doesn't match packet type")
        }
    }
    return packet;
}

class Decoder extends Emitter {
    constructor() {
        super();
        this.packer = null
    }
    add(data) {
        let packet
            , _this = this;
        if (typeOf(data, "string")) {
            if (_this.packer) {
                _this._clear()
                throw new Error("Got plain text when building a packet");
            }
            
            packet = decode(data);
            
            if (packet.type === PacketType.BINARY_EVENT) {
                _this.packer = new Packer(packet);
                // no attachments, labeled binary but no binary data to follow
                if (packet.binaries === 0) {
                    _this.emit("decoded", packet);
                    _this._clear()
                }
            }
            else {
                // non-binary full packet
                _this.emit("decoded", packet);
                _this._clear()
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
                    _this._clear()
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
        _this.packer = null
    }
}

export {
    PacketType,
    Encoder,
    Decoder
}