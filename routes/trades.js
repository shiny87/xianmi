var express = require('express');
var router = express.Router();
var conf = require("config");
var cookieParser = require('cookie-parser');
var http = require('http');
var qs = require('querystring');

router.get('/', function(req, res) {
    // check token

    // parse query string
    var tid = req.query.tid;
    var phone = req.query.phone;

    // exec query action
});

module.exports = router;
