function instOf(constructor, obj) {
    return obj instanceof constructor
}

function typeOf(obj, type) {
    return typeof obj === type
}

let isArray = Array.isArray;

function hasOwn(key, obj) {
    return obj.hasOwnProperty(key)
}

function isBinary(obj) {
    return ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer || obj.buffer instanceof ArrayBuffer || obj instanceof Blob || obj instanceof File;
}

function hasBinary(obj) {
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
}


module.exports = {
    instOf,
    typeOf,
    isArray,
    hasOwn,
    isBinary,
    hasBinary
}