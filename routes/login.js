var express = require('express');
var router = express.Router();
var conf = require('config');
var log4js = require('log4js');
log4js.configure(conf.log);
var logger = log4js.getLogger('erp');
var cookieParser = require('cookie-parser');
var http = require('http');
var qs = require('querystring');
var Utils = require('../lib/utils');
var mongo = require('../lib/mongo');

var TOKEN_TYPE_XM = 'TOKEN_XIANMI_ERP';

/* GET users listing. */
router.get('/', function (req, res) {
    var util = new Utils();
    var redirect_dir = null;
    if (!redirect_dir) {
        redirect_dir = '/index.html';
    }

    var request_id = '12345';
    var logmsg = '{type:"get", route:"login", request_id:' + request_id;

    var authInfo = req.session.authInfo;
    if (authInfo) {
        // check token
        util.checkAuthToken(TOKEN_TYPE_XM, authInfo, function (err, resObj) {
            if (err) {
                logmsg += ', err_msg: "checkToken err,' + err + '"}';
                logger.info(logmsg);
                res.render('innerlogin', null);
                return;
            }

            if (!resObj || resObj.error_code !== 200) {
                if (resObj.error_code) {
                    logmsg += ', err_msg: "checkToken failed, check_code is ' + resObj.error_code + '"}';
                } else {
                    logmsg += ', err_msg: "checkToken failed"}';
                }
                logger.info(logmsg);
                res.render('innerlogin', null);
                return;
            }

            logmsg += ', success: 1}';
            logger.info(logmsg);
            res.redirect(redirect_dir + '?' + util.makeAuthGetStr(req, res));
        });
    } else {
        logmsg += ', err_msg: "session.authInfo expired"}';
        logger.info(logmsg);
        res.render('innerlogin', null);
    }
    return;
});

router.post('/', function (req, res) {
    req.on('error', function (err) {
        logger.error('{err_msg: "http request error, %s"}', err);
        res.sendStatus(503);
        res.end();
    });
    res.on('error', function (err) {
        logger.error('{err_msg: "http response error, %s"}', err);
    });

    var chunks = [];
    req.on('data', function (chunk) {
        chunks.push(chunk);
    });

    req.on('end', function () {
        var o = Buffer.concat(chunks).toString();
        var jsonObj = null;
        try {
            jsonObj  = JSON.parse(o);
        } catch (err) {
            logger.warn('JSON.parse data:' + o + ' err:' + err);
            res.sendStatus(403);
            res.end();
            return;
        }

        var request_id = '12345';
        var logmsg = '{type:"post", route: "login", req_id:"' + request_id + '"';
        jsonObj.logmsg = logmsg;
        jsonObj.request_id = request_id;

        erpLogin(req, res, jsonObj);
    });


});

function erpLogin(req, res, jsonObj) {
    var util = new Utils();
    var logmsg = jsonObj.logmsg;
    var request_id = jsonObj.request_id;
    mongo.init(conf.mongoServer);

    var user_id = jsonObj.user_id;
    var login_token = jsonObj.login_token;
    if (!user_id || !login_token) {
        logmsg += ', err_msg: "no userid or login_token"}';
        logger.warn(logmsg);
        util.sendResponse(req, res, request_id, 400);
        return;
    }

    var query = {
        user_id: user_id,
        secret: login_token
    };

    var options = {
        user_id: true,
        auth_type: true,
        status: true
    };

    mongo.find(null, 'erpUsers', query, options, function (err, rows) {
        if (err) {
            logmsg += ', err_msg: "db err", db_err_msg:' + err + '}';
            logger.error(logmsg);
            util.sendResponse(req, res, request_id, 405);
            return;
        }

        if (!rows || rows.length < 1) {
            logmsg += ', err_msg: "account is not found"}';
            logger.info(logmsg);
            util.sendResponse(req, res, request_id, 461);
            return;
        }

        var userInfo = rows[0];
        if (userInfo.status !== 'OK') {
            logmsg += ', err_msg: "account is not normal"}';
            logger.info(logmsg);
            util.sendResponse(req, res, request_id, 462);
            return;
        }

        logmsg += ', checkUser: 1';


        var nowTs = Date.now() / 1000;
        util.generateAuthToken(user_id, login_token, userInfo.auth_type, nowTs, function (err, resObj) {

            if (err) {
                logmsg += ', err_msg: "' + err + '"}';
                logger.info(logmsg);
                util.sendResponse(req, res, request_id, 561);
                return;
            }


            if (!resObj || !resObj.session) {
                logmsg += ', err_msg: "no token"}';
                logger.info(logmsg);
                util.sendResponse(req, res, request_id, 561);
                return;
            }

            req.session.authInfo = {
                user_id: user_id,
                begin_ts: nowTs,
                token: resObj.session
            };

            logmsg += ', success: 1}';
            logger.info(logmsg);
            util.sendResponse(req, res, request_id, 200);

        }); // end generateAuthToken

    }); // end find
}

module.exports = router;
