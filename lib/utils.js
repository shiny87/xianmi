var conf = require("config");
var log4js = require('log4js');
log4js.configure(conf.log);
var logger = log4js.getLogger('erp');
var http = require('http');
var https = require('https');

var TOKEN_TYPE_XM = 'TOKEN_XIANMI_ERP';

function Utils() {
}

Utils.prototype.getErrorMsg = function (error_code) {
    var error_msg = conf.error[error_code];
    if (!error_msg) {
        error_msg = 'Server unexception error';
    }

    return error_msg;
};

Utils.prototype.sendResponse = function (req, res, request_id, error_code, param) {
    var response = {};
    response.request_id = request_id;
    response.error_code = error_code;
    response.error_msg = this.getErrorMsg(error_code);
    response.param = param;
    res.send(JSON.stringify(response));
};

Utils.prototype.getCheckTokenUrl = function (session) {
    if (!conf.authServers || !conf.authServers[0]) {
        return null;
    }

    var authServer = conf.authServers[0];
    var result = {};
    var body = {
        session: session 
    };
    result.https = authServer.https;
    result.host = authServer.host;
    result.port = authServer.port;
    result.method = 'POST';
    result.path = '/p/session';
    result.url = null;
    result.body = JSON.stringify(body);
    if (authServer.https) {
        result.url = 'https://' + authServer.host + ':' + authServer.port + result.path;
    } else {
        result.url = 'http://' + authServer.host + ':' + authServer.port + result.path;
    }

    return result;
};

Utils.prototype.getGenerateTokenUrl = function (user_id, secret, auth_type, ts) {
    if (!conf.authServers || !conf.authServers[0]) {
        return null;
    }

    var authServer = conf.authServers[0];
    
    var result = {};
    result.https = authServer.https;
    result.host = authServer.host;
    result.port = authServer.port;
    result.method = 'GET';
    result.path = '/p/session';
    result.url = null;
    if (authServer.https) {
        result.url = 'https://' + authServer.host + ':' + authServer.port + result.path + '?'
    } else {
        result.url = 'http://' + authServer.host + ':' + authServer.port + result.path + '?';
    }
    result.url += 'user_id=' + user_id;
    result.url += '&secret=' + secret;
    result.url += '&auth_type=' + auth_type;
    result.url += '&ts=' + ts;
    return result;
};

Utils.prototype.requestRestfulApi = function(authObj, callback) {
    if (!authObj || !callback) {
        if (callback) {
            callback('invalid param');
        }
        return;
    }

    if (authObj.method === 'GET') {
        try {
            http.get(authObj.url, function(http_res) {
                
                if(http_res.statusCode != 200) {
                    callback('http response code:' + http_res.statusCode);
                    return;
                }

                http_res.on('data', onData);
            });
        } catch (err) {
            callback(err);
            return;
        }
    } else if (authObj.method === 'POST') {
        try {
            var request = http.request(authObj, function (http_res) {
                if (http_res.statusCode !== 200) {
                    callback('http response code:' + http_res.statusCode);
                    return;
                }

                http_res.on('data', onData);
            });
            request.write(authObj.body);
            request.end();
        } catch(err) {
            callback(err);
            return;
        }

    } else {
        callback('invalid method');
    }

    function onData(d) {
        if (!d) {
            callback('response no data');
            return;
        }
        var resObj = null;
        try {
            resObj = JSON.parse(d.toString());
        } catch (err) {
            callback('response parse failed');
            return;
        }

        if (!resObj) {
            callback('response no body');
            return;
        }

        callback(null, resObj);
    } // end onData
};

Utils.prototype.generateAuthToken = function (user_id, secret, auth_type, ts, callback) {
    if (!user_id || !secret || !auth_type || !ts || !callback) {
        if (callback) {
            callback('invalid param');
        }
        return;
    }

    var authObj = this.getGenerateTokenUrl(user_id, secret, auth_type, ts);
    if (!authObj || !authObj.url) {
        callback('invalid auth conf');
        return;
    }

    this.requestRestfulApi(authObj, callback);
};

Utils.prototype.checkAuthToken = function (tokenType, authInfo, callback) {
    if (TOKEN_TYPE_XM === tokenType) {
        var authObj = this.getCheckTokenUrl(authObj.token);
        if (!authObj || !authObj.url) {
            callback('invalid auth conf');
            return;
        }
        this.requestRestfulApi(authObj, callback);
    } else {
        callback('Unknown token type');
    }
};

module.exports = Utils;
