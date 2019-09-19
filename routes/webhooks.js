var express = require('express');
var router = express.Router();

var _ = require('lodash');

var docusign = require('docusign-esign'),
  async = require('async'),
  fs = require('fs'),
  path = require('path');

router.get('/connect', function(req, res, next) {
	// The connect endpoint will be called every time your envelope status changes
	// - this is configured on a per-Account basis 
	// - overview: https://www.docusign.com/supportdocs/ndse-admin-guide/Content/custom-connect-configuration.htm#Overview

	// todo: app.helpers.updateEnvelopeLocal...

	console.log(req.body);
	
	res.send('ok-connect');
});

router.get('/event_notification', function(req, res, next) {

	// Use this endpoint for per-envelope EventNotifications

	// todo: app.helpers.updateEnvelopeLocal...

	console.log(req.body);

	res.send('ok-event-notification');

});


module.exports = router;

