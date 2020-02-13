var express = require('express');
var logger = require('morgan');
var path = require('path');

express.static.mime.types['wasm'] = 'application/wasm';

var app = express();

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Routes
var indexRouter = require('./routes/index');
var funcRouter = require('./routes/funcs');

app.use('/', indexRouter);
app.use('/func', funcRouter);

// Views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// var createError = require('http-errors');
// var cookieParser = require('cookie-parser');

//
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
//

// 404s
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// Errors
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};
//
//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

module.exports = app;
