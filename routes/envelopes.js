var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var marked = require('marked');

var docusign = require('docusign-esign'),
    dsAuthCodeGrant = require('../DSAuthCodeGrant');

router.get('/envelopes/:envelopeId/filelist/', function(req, res, next){
	app.models.Envelope.findOne({
		envelopeId: req.params.envelopeId,
		sessionId: req.session.id
	})
	.sort({_id: -1})
	.exec(function(err, envelope){
		res.render('envelopes',{
			envelopes: envelopes
		});
	});
});


router.get('/envelopes/:envelopeId/download/:documentId', function(req, res, next){
	app.models.Envelope.findOne({
		envelopeId: req.params.envelopeId,
		sessionId: req.session.id
	})
	.exec(function(err, envelope){
		if(err){
			return res.status(500).send(err);
		}
		if(!envelope){
			return res.status(404).send('Missing envelope');
		}

		// set the required authentication information
		let dsApiClient = new docusign.ApiClient();
		dsApiClient.setBasePath(req.session.basePath);
		dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + dsAuthCodeGrant.prototype.getAccessToken());

		// instantiate a new EnvelopesApi object
		var envelopesApi = new docusign.EnvelopesApi(dsApiClient);

		envelopesApi.getDocument(req.session.accountId, req.params.envelopeId, req.params.documentId, function (error, document, response) {
			if (error) {
				console.log('Error: ' + error);
				return;
			}
			if (document){
				var buffer = new Buffer(document,'binary'); // it arrives as an application/pdf in binary form
				var name = (envelope.data && envelope.data.name) ? envelope.data.name.split('.') : [req.params.envelopeId + '-' + req.params.documentId];
				if(name[name.length - 1].toLowerCase() != 'pdf'){
					name.push('pdf');
				}
				res.writeHead(200, {
				  'Content-Type': 'application/pdf',
				  'Content-Disposition': 'attachment; filename=' + name.join('.'),
				  'Content-Length': buffer.length
				});
				res.end(buffer);
			}
		});
	});
});


router.get('/envelopes', function(req, res, next){
	app.models.Envelope.find({
		sessionId: req.session.id
	})
	.exec(function(err, envelopes){
		console.log(JSON.stringify(envelopes,null,2));
		res.render('envelopes',{
			envelopes: envelopes
		});
	});
});

module.exports = router;