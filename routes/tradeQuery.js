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

/* GET trade */
router.get('/', function(req, res) {
    var util = new Utils();

    var request_id = '12345';
    var logmsg = '{type:"get", route: "tradeQuery", req_id:"' + request_id + '"';

    // check token TODO

    // check request
    var phoneNumber = req.query.phoneNumber;
    var tid = req.query.tid;
    // option params
    var tradeStatus = req.query.tradeStatus;
    var shipType = req.query.shipType;
    var optional = req.query.optional;
    if (!phoneNumber && !tid) {
        logmsg += ', err_msg: "no phoneNumber and tid"}';
        logger.warn(logmsg);
        util.sendResponse(req, res, request_id, 400);
        return;
    }

    // query db
    var query = {};
    if (!tradeStatus) {
        //query.status = 'WAIT_BUYER_PAY'; // FIXME 上线后应该是已付款状态
    } else if (tradeStatus === 'all') {
        query.status = null;
    } else {
        query.status = tradeStatus;
    }

    if (!shipType) {
        query.shipping_type = 'fetch';
    } else if (shipType === 'all') {
        query.shipping_type = null;
    } else {
        query.shipping_type = shipType;
    }

    if (tid) {
        query.tid = tid;
    } else if (phoneNumber) {
        if (query.shipping_type !== 'fetch') {
            logmsg += ', err_msg: "server only allow fetch type"}';
            logger.warn(logmsg);
            util.sendResponse(req, res, request_id, 402);
            return;
        }
        query['fetch_detail.fetcher_mobile'] = phoneNumber;
        // TODO add shop_name
        query['fetch_detail.shop_name'] = '沈阳大东店';
    }

    var options = {};
    if (!optional) {
        options = {
            tid: true,
            num: true,
            price: true,
            buyer_nick: true,
            buyer_message: true,
            receiver_mobile: true,
            receiver_city: true,
            receiver_district: true,
            receiver_name: true,
            receiver_state: true,
            receiver_address: true,
            receiver_zip: true,
            status_str: true,
            orders: true,
            fetch_detail: true
        };
    }

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
                logger.info('query success --------------------');
                logger.info(JSON.stringify(rows[0]));
                var param = {};
                param.trades_num = rows.length;
                param.trades = rows;
                util.sendResponse(req, res, request_id, 200, param);
            } else {
                logmsg += ', err_msg: "not found"}';
                logger.info(logmsg);
                util.sendResponse(req, res, request_id, 404);
            }
            db.close();
        });
    });

});

module.exports = router;
