var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');

global.pool = require('./config/dbpool');
require('./config/passportconfig')(passport);

// mapping mount points with router-level middleware modules   -> mount point와 연결
var index = require('./routes/index');
var members = require('./routes/members');
var mypages = require('./routes/mypages');
var myposts = require('./routes/myposts');
var orders = require('./routes/orders');
var posts = require('./routes/posts');
var preferences = require('./routes/preferences');
var rentalpushes = require('./routes/rentalpushes');
var replypushes = require('./routes/replypushes');
var scraps = require('./routes/scraps');

var app = express();
app.set('env', 'development');

// view engine setup -> index.js 돌아가기 위해 필요
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    "secret": process.env.BANG_SERVER_KEY,      //process.env.SERVER_KEY //0mvmPALOZpl/LdxolZ/nCpTG9gI8+4VPvs45PqSoAwQ=
    "cookie": { "maxAge": 86400000 },   // 하루(24)동안 유효 60(초)*60(분)*24(시간)*365(일)*1000
    "resave": true,
    "saveUninitialized": true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// mount points configutation
app.use('/', index);
app.use('/members', members);
app.use('/mypages', mypages);
app.use('/myposts', myposts);
app.use('/orders', orders);
app.use('/posts', posts) ;
app.use('/preferences', preferences);
app.use('/rentalpushes', rentalpushes);
app.use('/replypushes', replypushes);
app.use('/scraps', scraps);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: {}
  });
});


module.exports = app;
