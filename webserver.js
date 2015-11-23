var debug = require('debug')('xianmi-webapp');
var app = require('./app');
var conf = require('config');
var https = require('https');
var http = require('http');
var fs = require("fs");

var options = {
    key: fs.readFileSync('./cert/test.key'),
    cert: fs.readFileSync('./cert/test.cer')
};

if (conf.enableSsl) {
    https.createServer(options, app).listen(conf.serverPort, function () {
        console.log('Https server listening on port ' + conf.serverPort);
    });
} else {
    http.createServer(app).listen(conf.serverPort, function () {
        console.log('Http server listening on port ' + conf.serverPort);
    });
}
