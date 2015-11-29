var express = require('express');
var router = express.Router();
var conf = require("config");
var cookieParser = require('cookie-parser');
var http = require('http');
var qs = require('querystring');
var moment = require('moment');
var MongoClient = require('mongodb').MongoClient;
var log4js = require('log4js');
log4js.configure(conf.log);
var logger = log4js.getLogger('erp');
var Utils = require("../lib/utils");
var mongo = require("../lib/mongo");


var QUEUE_STATUS_PUSH = 'push';
var QUEUE_STATUS_POP = 'pop';
var QUEUE_STATUS_SKIP = 'skip';


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
        
        var request_id = '12345';
        var logmsg = '{type:"post", route: "queueing", req_id:"' + request_id + '"';
        var util = new Utils();

        // check token TODO
        //
        var method = jsonObj.method;
        var tid = jsonObj.tid;
        if (!method || !tid) {
            logmsg += ', err_msg: "no method or no tid"}';
            logger.warn(logmsg);
            util.sendResponse(req, res, request_id, 400);
            return;
        }

        logmsg += ', method: ' + method;
        logmsg += ', tid: ' + tid;
        
        jsonObj.logmsg = logmsg;
        jsonObj.request_id = request_id;
        if (method === 'queuePush') {
            pushQueue(req, res, jsonObj);
        } else if (method === 'queuePop') {
            popQueue(req, res, jsonObj);
        } else {
            logmsg += ', err_msg: "unexcption method"}';
            logger.warn(logmsg);
            util.sendResponse(req, res, request_id, 400);
        }
    });

}); // end post

router.get('/', function(req, res) {
    var jsonObj = {};
    var method = req.query.method;
    var pos = req.query.pos;
    
    var request_id = '12345';
    var logmsg = '{type:"post", route: "queueing", req_id:"' + request_id + '"';
    var util = new Utils();

    // Check Token TODO

    if (!method || !pos) {
        logmsg += ', err_msg: "no method or no pos"}';
        logger.warn(logmsg);
        util.sendResponse(req, res, request_id, 400);
        return;
    }

    if (method !== 'queueGet') {
        logmsg += ', err_msg: "unexcption method"}';
        logger.warn(logmsg);
        util.sendResponse(req, res, request_id, 400);
        return;
    }

    if (pos !== 'current') {
        logmsg += ', err_msg: "unexcption pos"}';
        logger.warn(logmsg);
        util.sendResponse(req, res, request_id, 400);
        return;
    }

    logmsg += ', method: ' + method;
    logmsg += ', pos: ' + pos;

    jsonObj.method = method;
    jsonObj.pos = pos;
    jsonObj.logmsg = logmsg;
    jsonObj.request_id = request_id;
    getQueue(req, res, jsonObj);
});

function pushQueue (req, res, jsonObj) {
    var logmsg = jsonObj.logmsg;
    var request_id = jsonObj.request_id;
    var tid = jsonObj.tid;
    var shopName = '沈阳大东店'; //FIXME
    var util = new Utils();
    mongo.init(conf.mongoServer);

    var query = {};
//    query.status = 'WAIT_BUYER_PAY'; // FIXME 上线后应该是已付款状态
    query.shipping_type = 'fetch';
    query.tid = tid;
    query['fetch_detail.shop_name'] = shopName;

    var options = {
        tid: true,
        num: true,
        price: true,
        fetchStatus: true
    };

    //MongoClient.connect(conf.mongoServer, function (err, db) {
    mongo.connect(conf.mongoServer, function (err, db) {
        if (err) {
            logmsg += ', err_msg: "connect db err", db_err_msg:' + err + '}';
            logger.error(logmsg);
            util.sendResponse(req, res, request_id, 405);
            return;
        }

        mongo.find(db, 'trades', query, options, function (err, rows) {
            if (err) {
                logmsg += ', err_msg: "db find op err", db_err_msg:' + err + '}';
                logger.error(logmsg);
                util.sendResponse(req, res, request_id, 405);
                return;
            }

            if (!rows || rows.length < 1) {
                logmsg += ', err_msg: "not found trade"}';
                logger.info(logmsg);
                util.sendResponse(req, res, request_id, 404);
                return;
            }

            logmsg += ', get_trade: 1';
            logger.info(JSON.stringify(rows[0]));
            var trade = rows[0];
            if (trade.fetchStatus) {
                logmsg += ', err_msg: "trade is fetched"}';
                logger.info(logmsg);
                util.sendResponse(req, res, request_id, 451);
                return;
            }

            logmsg += ', allow_fetch: 1';
            var queQuery = {
                tid: tid,
                shopName: shopName,
                status: QUEUE_STATUS_PUSH
            };
            var queOption = {
                tid: true,
                status: true,
                pushTime: true,
                popTime: true
            };

            mongo.find(db, 'queue', queQuery, options, function (err, rows) {
                if (err) {
                    logmsg += ', err_msg: "db find op err", db_err_msg:' + err + '}';
                    logger.error(logmsg);
                    util.sendResponse(req, res, request_id, 405);
                    return;
                }

                logmsg += ', get_queue_in: 1';
                if (rows && rows.length > 0) {
                    logmsg += ', exist_queue:1, success: 1}';
                    logger.info(logmsg);
                    var param = {};
                    param.tid = tid;
                    util.sendResponse(req, res, request_id, 200, param);
                    db.close(); //FIXME db.close need safely and shoold used connection pool
                    return;
                }

                var queueInfo = {
                    tid: tid,
                    status: QUEUE_STATUS_PUSH,
                    shopName: shopName,
                    pushTime: Date.now()
                };
                mongo.insert(db, 'queue', queueInfo, function (err) {
                    if (err) {
                        logmsg += ', err_msg: "db find op err", db_err_msg:' + err + '}';
                        logger.error(logmsg);
                        util.sendResponse(req, res, request_id, 405);
                        return;
                    }

                    var param = {};
                    param.tid = tid;
                    util.sendResponse(req, res, request_id, 200, param);
                    logmsg += ', push_queue:1, success: 1}';
                    logger.info(logmsg);

                    db.close(); //FIXME db.close need safely and shoold used connection pool
                });
            }); // end find queue
        }); // end find trades
    }); // end mongo connect
}

function popQueue (req, res, jsonObj) {
    var logmsg = jsonObj.logmsg;
    var request_id = jsonObj.request_id;
    var tid = jsonObj.tid;
    var action = jsonObj.action;
    var skip = false;
    var shopName = '沈阳大东店'; // FIXME
    var util = new Utils();
    mongo.init(conf.mongoServer);

    if (!action) {
        skip = false;
    } else if (action === 'skip') {
        skip = true;
    } else {
        logmsg += ', exception action}';
        logger.error(logmsg);
        util.sendResponse(req, res, request_id, 400);
        return;
    }

    logmsg += ', skip:' + skip;

    mongo.connect(conf.mongoServer, function (err, db) {
        if (err) {
            logmsg += ', err_msg: "connect db err", db_err_msg:' + err + '}';
            logger.error(logmsg);
            util.sendResponse(req, res, request_id, 405);
            return;
        }

        var queQuery = {
            tid: tid,
            status: QUEUE_STATUS_PUSH
        };
        var queOptions = {
            tid: true,
            status: true,
            pushTime: true,
            popTime: true
        };
        mongo.find(db, 'queue', queQuery, queOptions, function (err, rows) {
            if (err) {
                logmsg += ', err_msg: "db find op err", db_err_msg:' + err + '}';
                logger.error(logmsg);
                util.sendResponse(req, res, request_id, 405);
                return;
            }

            if (!rows || rows.length < 1) {
                logmsg += ', err_msg: "not found in queue"}';
                logger.info(logmsg);
                util.sendResponse(req, res, request_id, 404);
                db.close(); //FIXME db.close need safely and shoold used connection pool
                return;
            }
            logmsg += ', get_queue_in: 1';
            var curItem = rows[0];
            logger.info(JSON.stringify(curItem));
            if (!skip) {
                // 先更新trades
                var key = {
                    tid: tid,
                };
                var body = {
                    fetchStatus: 1,
                    fetchTime: Date.now()
                }
                mongo.update(db, 'trades', key, body, function (err) {
                    if (err) {
                        logmsg += ', err_msg: "db find op err", db_err_msg:' + err + '}';
                        logger.error(logmsg);
                        util.sendResponse(req, res, request_id, 405);
                        return;
                    }

                    logmsg += ', mark_trades_status: 1';
                    pop();
                });
            } else {
                pop();
            }
        });

        function pop() {
            var key = {
                tid: tid,
                status: QUEUE_STATUS_PUSH
            };
            var body = {
                status: (skip ? QUEUE_STATUS_SKIP : QUEUE_STATUS_POP),
                popTime: Date.now()
            };
            mongo.update(db, 'queue', key, body, function (err) {
                if (err) {
                    logmsg += ', err_msg: "db find op err", db_err_msg:' + err + '}';
                    logger.error(logmsg);
                    util.sendResponse(req, res, request_id, 405);
                    return;
                }

                logmsg += ', mark_queue_status: 1, success: 1}';
                logger.info(logmsg);
                var param = {};
                param.tid = tid;
                util.sendResponse(req, res, request_id, 200, param);
                db.close(); //FIXME db.close need safely and shoold used connection pool
            });
        }
    }); // end mongo connect
}

function getQueue(req, res, jsonObj) {
    var logmsg = jsonObj.logmsg;
    var request_id = jsonObj.request_id;
    var tid = jsonObj.tid;
    var shopName = '沈阳大东店'; //FIXME
    var util = new Utils();
    mongo.init(conf.mongoServer);

    var query = {
    };
    query.status = 'WAIT_BUYER_PAY'; // FIXME 上线后应该是已付款状态
    query.shipping_type = 'fetch';
    query.tid = tid;
    query['fetch_detail.shop_name'] = shopName;

    var options = {
        tid: true,
        num: true,
        price: true,
        fetchStatus: true
    };

    MongoClient.connect(conf.mongoServer, function (err, db) {
        if (err) {
            logmsg += ', err_msg: "db connect err", db_err_msg:' + err + '}';
            logger.error(logmsg);
            util.sendResponse(req, res, request_id, 405);
            return;
        }

        var collection = db.collection('queue');
        var pipeline = [
            {$match: 
                {$and: [
                    {shopName: shopName},
                    {status: QUEUE_STATUS_PUSH}
                ]}
            },
            {$sort: {pushTime: 1}},
            {$limit: 1}
        ];
        collection.aggregate(pipeline, function (err, rows) {
            if (err) {
                logmsg += ', err_msg: "db aggreate err", db_err_msg:' + err + '}';
                logger.error(logmsg);
                util.sendResponse(req, res, request_id, 405);
                return;
            }
            if (rows && rows.length > 0) {
                JSON.stringify(rows[0]);
                var param = {
                    tid: rows[0].tid
                }
                util.sendResponse(req, res, request_id, 200, param);
                logmsg += ', success: 1}';
                logger.info(logmsg);
            } else {
                logmsg += ', err_msg: no more trade in queue';
                util.sendResponse(req, res, request_id, 404);
                logger.info(logmsg);
            }
            db.close(); //FIXME db.close need safely and shoold used connection pool
        });
    });
}

module.exports = router;
