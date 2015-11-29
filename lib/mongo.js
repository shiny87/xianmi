
/**
 * Mongo Operation
 * @file mongo.js
 * @author shenxin (shenxin@baidu.com)
 * @description Mongo Operation Wrap
 */

'use strict'; // run code in ES5 strict mode

var MongoClient = require('mongodb').MongoClient;
var conf = require('config');
var log4js = require('log4js');
log4js.configure(conf.log);
var logger = log4js.getLogger('erp');

function MongoConn() {
    this.db = null;
    this.url = null;
}

MongoConn.prototype.init = function (url) {
    this.url = url;
};

MongoConn.prototype.connect = function (url, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) {
            logger.warn('Mongo Connect Url:' + url + ' err:' + err);
            if (callback) {
                callback(err);
            }
        } else {
            logger.info('Mongo Connect Url:' + url + ' success');
            if (callback) {
                callback(err, db);
            }
        }
    });
};

MongoConn.prototype.insert = function (db, collectionName, body, callback) {
    var closeDb = true;
    if (db) {
        work(db, collectionName, body, callback);
        closeDb = false;
    } else {
        this.connect(this.url, function (err, db) {
            if (err) {
                if (callback) {
                    callback(err);
                }
                db.close();
                return;
            }
            work(db, collectionName, body, callback);
        });
    }

    function work(db, collectionName, body, callback) {
        var collection = db.collection(collectionName);
        var rows = [];
        rows.push(body);
        collection.insert(rows, function (err, result) {
            if (err) {
                logger.warn('insert mongo faild, data:' + body);
                if (callback) {
                    callback(err);
                }
            } else {
                if (result.result.n !== rows.length) {
                    if (callback) {
                        callback('insert rows mismatch');
                    }
                } else {
                    if (callback) {
                        callback(null);
                    }
                }
            }
            if (closeDb) {
                db.close();
            }
        });
    }
};

MongoConn.prototype.find = function (db, collectionName, key, options, callback) {
    var closeDb = true;
    if (db) {
        work(db, collectionName, key, options, callback);
        closeDb = false;
    } else {
        this.connect(this.url, function (err, db) {
            if (err) {
                if (callback) {
                    callback(err);
                }
                return;
            }
            work(db, collectionName, key, options, callback);
        });
    }

    function work(db, collectionName, key, options, callback) {
        var collection = db.collection(collectionName);
        collection.find(key, options).toArray(function (err, rows) {
            if (callback) {
                callback(null, rows);
            }
            if (closeDb) {
                db.close();
            }
        });
    }
};

MongoConn.prototype.update = function (db, collectionName, key, body, callback) {
    var that = this;
    var closeDb = true;
    if (db) {
        work(db, collectionName, key, body, callback);
        closeDb = false;
    } else {
        this.connect(this.url, function (err, db) {
            if (err) {
                if (callback) {
                    callback(err);
                }
                return;
            }
            work(db, collectionName, key, body, callback);
        });
    }

    function work(db, collectionName, key, body, callback) {
        var collection = db.collection(collectionName);
        var options = {upsert: true};
        collection.update(key, {$set: body}, options, function (err, result) {
            if (err) {
                logger.warn('update mongo faild, key:' + key + ' body:' + body);
                if (callback) {
                    callback(err);
                }
            } else {
                if (result.result.n !== 1) {
                    if (callback) {
                        callback('update rows mismatch');
                    }
                } else {
                    if (callback) {
                        callback(null);
                    }
                }
            }

            if (closeDb) {
                db.close();
            }
        });
    }
};

MongoConn.prototype.updateArray = function (collectionName, keys, bodys, callback) {
    if (!keys || !bodys) {
        callback('keys, bodys invalid');
        return;
    }
    if (keys.length !== bodys.length) {
        callback('keys, bodys not match');
        return;
    }

    var that = this;
    this.connect(this.url, function (err, db) {
        if (err) {
            if (callback) {
                callback(err);
            }
            return;
        }

        var collection = db.collection(collectionName);
        var itemsNum = keys.length;
        var callbackNum  = 0;
        var errNum = 0;
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            var body = bodys[i];
            var options = {upsert: true};
            collection.update(key, {$set: body}, options, function (err, result) {
                if (err) {
                    logger.warn('update mongo faild, key:' + key + ' body:' + body);
                    if (callback) {
                        callback(err);
                        errNum++;
                    }
                } else {
                    if (result.result.n !== 1) {
                        if (callback) {
                            callback('update rows mismatch');
                            errNum++;
                        }
                    }
                }
                callbackNum++;
                if (callbackNum === itemsNum) {
                    db.close();
                    if (!errNum && callback) {
                        callback(null);
                    }
                }
            });
        }
    });
};

module.exports = new MongoConn();
