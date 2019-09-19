var express = require('express');
var router = express.Router();

var _ = require('lodash');

var docusign = require('docusign-esign'),
  async = require('async'),
  fs = require('fs'),
  path = require('path'),
  dsAuthCodeGrant = require('../DSAuthCodeGrant');

//   router.get('/ds/callback', function(req, res, next) {
//     res.render('loan-personal', {
// 			signing_location_options: app.helpers.signing_location_options,
// 			authentication_options: app.helpers.authentication_options
// 		});
// });

router.get('/ds/callback', [dsLoginCB1, dsLoginCB2]);

function dsLoginCB1 (req, res, next) {dsAuthCodeGrant.prototype.oauth_callback1(req, res, next)}
function dsLoginCB2 (req, res, next) {dsAuthCodeGrant.prototype.oauth_callback2(req, res, next)}

module.exports = router;