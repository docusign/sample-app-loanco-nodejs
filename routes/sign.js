var express = require('express');
var router = express.Router();

var _ = require('lodash');

var docusign = require('docusign-esign'),
  async = require('async'),
  fs = require('fs'),
  path = require('path');


router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

router.get('/pop/:popid', function(req, res, next) {
	// used for breaking out of the iframe after embedded signing
	res.render('pop', {
		layout: false,
		pop: req.params.popid
	});
});

router.get('/sign/remote', function(req, res){
	res.render('remotesign');
});

router.get('/sign/embedded', function(req, res){
	var signingUrl = req.session.signingUrl;
	if(!signingUrl){
		return res.redirect('/');
	}
	res.locals.session.signingUrl = signingUrl;
	res.locals.session.isRedirected = true;
	res.locals.session.clientId = process.env.DOCUSIGN_IK;
	res.redirect(res.locals.session.redirectLink);
});

router.get('/sign/return', function(req, res){

	// https://developers.docusign.com/esign-rest-api/reference/Envelopes/EnvelopeViews/createRecipient

	// signing_complete (signer completed the signing ceremony)
	// cancel (recipient canceled the signing operation)
	// decline (recipient declined to sign)
	// exception (an exception occurred)
	// fax_pending (recipient has a fax pending)
	// session_timeout (session timed out)
	// ttl_expired (the time to live timer expired)
	// viewing_complete (recipient completed viewing the envelope)

	var msg = '';

	switch(req.query.event){

		case 'signing_complete':
			 // (signer completed the signing ceremony)
			 msg = "You have signed the document!  The document will be securely stored on the DocuSign, Inc. servers.";
			 break;

		case 'cancel':
			 // (recipient canceled the signing operation)
			 msg = "You have cancelled out of the signing experience. You clicked 'Finish Later' instead of 'Decline to Sign'";
			 break;

		case 'decline':
			 // (recipient declined to sign)
			 msg = "You have declined to sign the document. This has VOIDED the document.";
			 break;

		case 'exception':
			 // (an exception occurred)
			 msg = "An exception has occurred on the server.  Please check the parameters passed to the Web Service Methods.";
			 break;

		case 'fax_pending':
			 // (recipient has a fax pending)
			 msg = "You have a fax pending. ";
			 break;

		case 'session_timeout':
			 // (session timed out)
			 msg = "You did not sign the document in time.  The timeout is set to 20 minutes.";
			 break;

		case 'ttl_expired':
			 // (the time to live timer expired)
			 msg = "Trusted connection has expired.  The server communication might be a problem.";
			 break;

		case 'viewing_complete':
			 // (recipient completed viewing the envelope)
			 msg = "You have viewed the document without signing it.";
			 break;

		default:
			console.error('Missing event type:', req.query.event);
			break;


	}

	// Get the next embedded signer
	if(req.query.event == 'signing_complete'
		&& req.session
		&& req.session.remainingSigners
		&& req.session.remainingSigners.length){

		var signer = req.session.remainingSigners[0];

		if(req.query.next){

			// remove this signer from the array
			req.session.remainingSigners.shift();

	        app.helpers.getRecipientUrl(req, req.session.envelopeId, signer, function(err, data){
	        	if(err){
			        res.send('Error with getRecipientUrl, please try again');
	        		return console.error(err);
	        	}

	    		req.session.signingUrl = data.url;
	    		res.redirect('/sign/embedded');

	        });
	        return;
	    }

		res.render('signingreturn',{
			event: req.query.event,
			msg: msg,
			waitingForRemote: (signer == 'remote-signer'),
			nextUrl: req.originalUrl + '&next=true'
		});

    } else {

		res.render('signingreturn',{
			event: req.query.event,
			msg: msg
		});
	}

});

module.exports = router;