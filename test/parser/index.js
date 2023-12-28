import {PacketType, Encoder, Decoder} from './parser.esm.js'

let buf = new Uint8Array([76,9,23,6,4,100])

let data = {
    type: PacketType.EVENT,
    data: ['event', {text: 'Hello world!'}]
}
let data2 = {
    type: PacketType.MESSAGE,
    data: ['picture.png', buf]
}

let encoder = new Encoder();
let decoder = new Decoder();


//let pack = enc.encode(data)
let pack2 = encoder.encode(data2)
//console.log(pack)
console.log(pack2)

decoder.on('decoded', console.log)

encoder.on('error', console.log)
decoder.on('error', console.log)
//for (let p of pack) dec.add(p)
for (let p of pack2) decoder.add(p)
