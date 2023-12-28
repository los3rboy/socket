import {Emitter} from './emitter.js'
import {Encoder, Decoder} from './parser.js'

let encoder = new Encoder();

export class Transport extends Emitter {
    constructor(path, options){ //socket options
        super()
        //
        let _this = this
            , url = /^wss?:\/\//.test(path) ? path : 'ws://' + location.host + path
            , ws = new WebSocket(url)
            , decoder = new Decoder();
            
        _this.open = false;
        
        ws.binaryType = 'arraybuffer';
        ws.onopen = () => {
            _this.open = true;
            _this.emit('open')
        }
        //FIX THIS (JOGA SERVER CLOSE MESMO
        // ANTES DA CONEXAO)
        ws.onerror = (e) => {//analizar codigo e disparar a mensagem adequada
            let error = new Error('Connection error');
            
            error.code = 'connection_error'
            _this.emit('error', error);
        }
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
        }
        
        ws.onmessage = ({data}) => {//ALL HAPPENS HERE
            _this.decoder.add(data)
        }
        
        decoder.on('decoded', packet => {
            _this.emit('packet', packet)
        });
        
        decoder.on('error', err => {
            err.code = 'decoder_error';
            _this.emit('error', err)
        });
        
        _this.ws = ws;
        _this.decoder = decoder
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
        _this.off()
    }
    //TODO: implement send buffer, drain
    send(packet) {
        let _this = this, encoded = encoder.encode(packet);
        if (_this.open) {
            for (let chunk of encoded) {
                if (Object.prototype.toString.call(chunk) === '[object Object]') {
                    try {data = JSON.stringify(chunk) } catch(e) {}
                }
                this.ws.send(chunk);
            }
        } else {
            let err = new Error('Transport not writable');
            err.code = 'write_error';
            _this.emit('error', err)
        }
    }
    
    close(code) {
        if (this.open) {
            this.ws.close(code)
        }
    }
}