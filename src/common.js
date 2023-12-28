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
}


export {
    instOf,
    typeOf,
    isArray,
    hasOwn,
    isBinary,
    hasBinary
}