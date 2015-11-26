var express = require('express');
var router = express.Router();
var conf = require("config");
var Utils = require("../lib/utils");
var cookieParser = require('cookie-parser');
var http = require('http');
var qs = require('querystring');

/* GET users listing. */
router.get('/', function(req, res) {
    var redirect_dir = null;
    var utils = new Utils();
    if(!redirect_dir) {
        redirect_dir = "/console";
    }

    if (req.query.xm_token) {
        req.session.authinfo = {'xm_uid': req.query.xm_uid, 'xm_token': req.query.xm_token, 'nick_name': req.query.nick_name};
        res.redirect(redirect_dir);
    } else {
        res.render("innerlogin", null);
    }
    return;
});

module.exports = router;
