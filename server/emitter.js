const e = Symbol('kEvent');

exports.Emitter = class Emitter {
    constructor(){
        this[e] = new Map();
    }
    on(key, cb){
        let map = this[e];
        
        if (!map.has(key)) map.set(key, new Set());
        map.get(key).add(cb)
        return this;
    }
    event(key, ...args) {
        let _this = this, map = _this[e];
        
        if (map.has(key)) {
            for (let cb of map.get(key)) {
                cb.apply(_this, args)
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
        }
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
            if (!callbacks.size) map.delete(callbacks)
        }
        return _this
    }
}
