var express = require('express');
var router = express.Router();
var session = require('express-session');  // https://github.com/expressjs/session
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var MemoryStore = require('memorystore')(session); // https://github.com/roccomuso/memorystore
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var marked = require('marked');
var passport = require('passport');
var helmet = require('helmet'); // https://expressjs.com/en/advanced/best-practice-security.html
var DocusignStrategy = require('passport-docusign');
var moment = require('moment');

router.get('/', function(req, res, next) {
	console.log(app.config);
	res.render('index', { title: 'LoanCo' });
});

app.use(passport.initialize());
app.use(passport.session());
app.use(((req, res, next) => {
  res.locals.user = req.user;
  res.locals.session = req.session;
  next()})); // Send user info to views

  // Include all of our routes
app.use('/', require('./loan-personal'));
app.use('/', require('./loan-auto'));
app.use('/', require('./loan-sailboat'));
app.use('/', require('./purchase-land'));
app.use('/', require('./sign'));
app.use('/', require('./envelopes'));
app.use('/', require('./webhooks'));
app.use('/', require('./ds-callback'));
app.use(helmet());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: '12345', // used to compute the hash value of the session, any number would do.
    name: 'loanCo',
    cookie: {maxAge: 180000},
    saveUninitialized: true,
    resave: true,
    store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
  })}))


// Static/Markdown pages
var pages = [
	'about-us',
];
pages.forEach(function(page){
	router.get('/' + page, function(req, res, next){
	  	var file = fs.readFileSync(path.join(__dirname, '../views/markdown/'+page+'.md'), 'utf8');
		var htmlContent = marked(file.toString());
		res.render('static',{
			content: htmlContent
		});
	});
});

router.get('/restart-session', function(req, res, next) {
  app.models.Envelope.remove({
    userId: req.user?.sub
  })
  
  req.session.destroy();
  res.redirect('/');
});


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete DocuSign profile is serialized
//   and deserialized.
passport.serializeUser  (function(user, done) {done(null, user)});
passport.deserializeUser(function(obj,  done) {done(null, obj)});

// Configure passport for DocusignStrategy
let docusignStrategy = new DocusignStrategy({
	  production: false,
    clientID: app.config.auth.IntegrationKey,
    clientSecret: app.config.auth.ClientSecret,
    callbackURL: `${app.config.auth.LocalReturnUrl}/ds/callback`,
    state: true // automatic CSRF protection.
    // See https://github.com/jaredhanson/passport-oauth2/blob/master/lib/state/session.js
  },
  function _processDsResult(accessToken, refreshToken, params, profile, done) {
    // The params arg will be passed additional parameters of the grant.
    // See https://github.com/jaredhanson/passport-oauth2/pull/84
    //
    // Here we're just assigning the tokens to the account object
    // We store the data in DSAuthCodeGrant.getDefaultAccountInfo

    console.log('***********_processDsResult - start**************');
    let user = profile;
    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    user.expiresIn = params.expires_in;
    user.tokenExpirationTimestamp = moment().add(user.expiresIn, 's'); // The dateTime when the access token will expire
    return done(null, user);
  }
);
passport.use(docusignStrategy);


module.exports = router;
