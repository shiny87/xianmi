var express = require('express');
var ClientSession = require('client-sessions');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var expressSanitizer = require('express-sanitizer');

var index = require('./routes/index');
var login = require('./routes/login');
var logout = require('./routes/logout');
var tradeQuery = require('./routes/tradeQuery');
var tradeUpdate = require('./routes/tradeUpdate');
var queueing = require('./routes/queueing');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/login', login);
app.use('/logout', logout);
app.use('/tradeQuery', tradeQuery);
app.use('/tradeUpdate', tradeUpdate);
app.use('/queueing', queueing);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
