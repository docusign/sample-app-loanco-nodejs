var express = require('express');
var exphbs  = require('express-handlebars');
var fs = require('fs');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var _ = require('lodash');
var moment = require('moment');
var passport = require('passport');
var helmet = require('helmet');

// In case of uncaught exception, print the full-stack
process.on('uncaughtException', function(err) {
  console.error((err && err.stack) ? err.stack : err);
});

var app = express().use(passport.initialize()).use(helmet());
global.app = app;

app.config = require('./config');
app.helpers = require('./helpers');

app.locals.default_email = app.config.default_email;

// view engine setup
app.engine('hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs',
  helpers: {
    toJSON : function(object) {
      return JSON.stringify(object);
    },
    ifCond : function(obj1, sign, obj2, options) {
      switch(sign){

        case '==':
          return obj1 == obj2 ? options.fn(this):options.inverse(this);

        case '===':
          return obj1 === obj2 ? options.fn(this):options.inverse(this);

        case '!=':
          return obj1 != obj2 ? options.fn(this):options.inverse(this);

        case '>=':
          return obj1 >= obj2 ? options.fn(this):options.inverse(this);

        case '<=':
          return obj1 <= obj2 ? options.fn(this):options.inverse(this);

        case '>':
          return obj1 > obj2 ? options.fn(this):options.inverse(this);

        case '<':
          return obj1 < obj2 ? options.fn(this):options.inverse(this);

        default:
          console.error('no sign match:', sign);
          break;
      }
    },
    moment: function(context, block){

      if (context && context.hash) {
        block = _.cloneDeep(context);
        context = undefined;
      }
      var date = moment(context);
      var hasFormat = false;

      // Reset the language back to default before doing anything else
      date.lang('en');

      for (var i in block.hash) {
        if (i === 'format') {
          hasFormat = true;
        }
        else if (date[i]) {
          date = date[i](block.hash[i]);
        } else {
          console.log('moment.js does not support "' + i + '"');
        }
      }

      if (hasFormat) {
        date = date.format(block.hash.format);
      }
      return date;
    }
  },
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// // uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.models = require('./models');

var session = require('express-session');
app.use(session({
  secret: app.config.session_secret,
  resave: false,
  saveUninitialized: false
}));


// set up a route to redirect http to https (in case dns not setup)
app.get('*',function(req,res,next){
  console.log('Incoming request...');
  console.log('hostname:', req.hostname);
  console.log('origin:', req.origin);
  console.log('url:', req.url);
  console.log('headers:', JSON.stringify(req.headers));
  console.log('body:', req.body);
  if(app.config.force_https && !req.secure){
    console.log('Redirecting to https');
    var domain = req.hostname;
    return res.redirect('https://' + domain + req.url);
  }
  next();
});

app.use('/', function(req, res, next){
  console.log('req.session start:', JSON.stringify(req.session));
  // setup session id if not already set
  if(!req.session.id){
    req.session.id = require('guid').raw();
  }

  // update session settings
  req.session.config = req.session.config || {};
  var defaultsToUse = [
    'signing_location',
    'authentication',
    'access_code'
  ];
  _.each(defaultsToUse, function(key){
    req.session.config[key] = (key in req.session.config) ? req.session.config[key] : app.config[key];
  });

  // set the locale
  req.session.config['locale'] = 'en';

  console.log('req.session end:', JSON.stringify(req.session));
  next();
});

app.use('/', require('./routes/index'));

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
    console.error(err.stack);
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err.stack
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


// Create and start the HTTP server
 var server = require('http').Server(app);
 server.listen(3801, function() {
  console.log('HTTP being served on 3801');});

//Create and start the HTTPS server
var useHttps = fs.existsSync('server.key') && fs.existsSync('server.crt');
if(useHttps){
  var privateKey = fs.readFileSync('server.key');
  var certificate = fs.readFileSync('server.crt');
  var httpsServer;
  try {
      var credentials = configWithCryptoOptions({
        key: privateKey,
        cert: certificate
      });
    
      httpsServer = require('https').Server(credentials, app);
  }catch(err){
    console.error('HTTPS server failed to start. Missing key or crt');
  }

  httpsServer && httpsServer.listen(4443, function() {
  console.log('HTTPS being served on 4443');});
}

app.setup = require('./setup');

app.on('error', onError);

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function configWithCryptoOptions(serverConfig) {
  serverConfig.ciphers = [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'DHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'DHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES256-SHA256',
    'DHE-RSA-AES256-SHA256',
    'ECDHE-RSA-AES128-SHA256',
    'DHE-RSA-AES128-SHA256',
    'HIGH',
    '!aNULL',
    '!eNULL',
    '!EXPORT',
    '!DES',
    '!RC4',
    '!MD5',
    '!PSK',
    '!SRP',
    '!CAMELLIA',
    '!ECDH',
    '!DSS',
    '!RSA-3DES-EDE-CBC-SHA',
    '!RSA-AES256-GCM-SHA384',
    '!RSA-AES256-CBC-SHA256',
    '!RSA-AES256-CBC-SHA',
    '!RSA-AES128-GCM-SHA256',
    '!RSA-AES128-CBC-SHA256',
    '!RSA-AES128-CBC-SHA',
    '!ECDHE-RSA-3DES-EDE-CBC-SHA',
  ].join(':');

  serverConfig.honorCipherOrder = true;

  const constants = require('constants');
  serverConfig.secureOptions = constants.SSL_OP_NO_TLSv1_1 | constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2;

  return serverConfig;
}

module.exports = app;
