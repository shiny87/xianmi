var express = require('express');
var router = express.Router();
var conf = require("config");
var Utils = require("../lib/utils");
var cookieParser = require('cookie-parser');
var http = require('http');
var qs = require('querystring');
var moment = require('moment');
var MongoClient = require('mongodb').MongoClient;
var log4js = require('log4js');
log4js.configure(conf.log);
var logger = log4js.getLogger('erp');

router.post('/', function(req, res) {
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
        var util = new Utils();

        var request_id = '12345';
        var logmsg = '{type:"post", route: "tradeUpdate", req_id:"' + request_id + '"';

        // check token TODO
        var tid = jsonObj.tid;
        var method = jsonObj.method;
        var fetchStatus = jsonObj.fetchStatus;
        if (!tid || !method || fetchStatus == null) {
            logmsg += ', err_msg: "no tid or method or fetchStatus"}';
            logger.warn(logmsg);
            util.sendResponse(req, res, request_id, 400);
            return;
        }

        if (method !== 'updateFetchStatus') {
            logmsg += ', err_msg: "invalid method"}';
            logger.warn(logmsg);
            util.sendResponse(req, res, request_id, 400);
            return;
        }
        
        if (method === 'updateFetchStatus') {
        }

        var query = {
        };
        //query.status = 'WAIT_BUYER_PAY'; // FIXME 上线后应该是已付款状态
        query.tid = tid;
        query.shipping_type = 'fetch';
        var options = {};
        options = {
            tid: true,
            num: true
        };

        MongoClient.connect(conf.mongoServer, function (err, db) {
            if (err) {
                logmsg += ', err_msg: "connect db err", db_err_msg:' + err + '}';
                logger.error(logmsg);
                util.sendResponse(req, res, request_id, 405);
                return;
            }

            var collection = db.collection('trades');
            collection.find(query, options).toArray(function (err, rows) {
                if (err) {
                    logmsg += ', err_msg: "db find op err", db_err_msg:' + err + '}';
                    logger.error(logmsg);
                    util.sendResponse(req, res, request_id, 405);
                    return;
                }

                if (rows && rows.length >= 1) {
                    logger.info(JSON.stringify(rows[0]));
                    var key = {
                        tid: tid
                    };
                    var body = {
                        fetchStatus: fetchStatus
                    };
                    collection.update(key, {$set: body}, function (err, result) {
                        if (err) {
                            logmsg += ', err_msg: "db update op err", db_err_msg:' + err + '}';
                            logger.error(logmsg);
                            util.sendResponse(req, res, request_id, 405);
                            return;
                        }

                        if (result.result.n < 1) {
                            logmsg += ', err_msg: "db update mismatch}';
                            logger.error(logmsg);
                            util.sendResponse(req, res, request_id, 404);
                        } else {
                            var param = {};
                            param.tid = tid;
                            util.sendResponse(req, res, request_id, 200, param);
                        }

                        db.close(); //FIXME db.close need safely and shoold used connection pool
                    }); // end update

                } else {
                    logger.info(logmsg);
                    logmsg += ', err_msg: "not found"}';
                    util.sendResponse(req, res, request_id, 404);
                }
            }); // end find

        }); // end connect Mongo
    }); // end on res.data
     
});

module.exports = router;
