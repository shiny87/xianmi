var express = require('express');
var router = express.Router();
var conf = require("config");

/* GET home page. */
router.get('/', function(req, res) {
    res.render('error', {message: "welcome visit",  error: {status: "", stack: ""}});
});
module.exports = router;
