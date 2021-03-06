var restify = require('restify');

exports.allowHeaders = ['Origin', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 'X-Api-Version', 'Api-Version', 'X-Request-Id' , 'X-Response-Time', 'KulaAuth', 'X-PINGOTHER', 'X-CSRF-Token', 'If-Modified-Since', 'X-HTTP-Method-Override'];

exports.cors = function (req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Headers', exports.allowHeaders.join(', '));
    res.header('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, DELETE, PUT');
    res.header('Access-Control-Expose-Headers', 'Last-Modified');
    res.header('Access-Control-Max-Age', '86400');
    next();
}

exports.unknownMethodHandler = function (req, res) {
    if (req.method.toLowerCase() === 'options') {
        if (res.methods.indexOf('OPTIONS') === -1) res.methods.push('OPTIONS');
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Headers', exports.allowHeaders.join(', '));
        res.header('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, DELETE, PUT');
        res.header('Access-Control-Expose-Headers', 'Last-Modified');
        res.header('Access-Control-Max-Age', '86400');
        return res.send(204);
    }
    else return res.send(new restify.MethodNotAllowedError());
}

