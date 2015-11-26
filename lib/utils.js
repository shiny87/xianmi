var conf = require("config");
var log4js = require('log4js');
log4js.configure(conf.log);
var logger = log4js.getLogger('erp');

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

module.exports = Utils;
