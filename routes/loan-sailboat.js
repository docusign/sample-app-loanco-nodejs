var express = require('express');
var router = express.Router();

var _ = require('lodash');

var GoogleMapsAPI = require('googlemaps');

var docusign = require('docusign-esign'),
  async = require('async'),
  fs = require('fs'),
  path = require('path'),
  dsAuthCodeGrant = require('../DSAuthCodeGrant');

router.get('/loan/sailboat', function(req, res, next) {
    let tokenOK = dsAuthCodeGrant.prototype.checkToken(3);
    if (! tokenOK) {
		req.session.loan = 'sailboat';
		dsAuthCodeGrant.prototype.login(req, res, next)    
	}
	else {	
		res.render('loan-sailboat', {
			signing_location_options: app.helpers.signing_location_options,
			authentication_options: app.helpers.authentication_options
		});
	}
});
router.post('/loan/sailboat', function(req, res, next) {

	var body = req.body;

	// Get Google map
	var gmAPI = new GoogleMapsAPI({
		key: app.config.google_maps_api_key,
		// stagger_time:       1000, // for elevationPath
		// encode_polylines:   false,
		// secure:             true, // use https
		// proxy:              'http://127.0.0.1:9999' // optional, set a proxy for HTTP requests
	});
	var params = {
	  center: '37.808546, -122.409767',
	  zoom: 15,
	  size: '500x400',
	  maptype: 'roadmap',
	  markers: [
		{
		  location: '37.808546, -122.409767',
		  icon: 'http://chart.apis.google.com/chart?chst=d_map_pin_icon&chld=cafe%7C996600'
		}
	  ],
	  style: [
		{
		  feature: 'road',
		  element: 'all',
		  rules: {
			hue: '0x00ff00'
		  }
		}
	  ]
	};
	
	// Download the map 
	var gmApiImageUrl = gmAPI.staticMap(params);
	var request = require('request').defaults({ encoding: null });
	request.get(gmApiImageUrl, function (mapErr, response, imageBody) {
		if(mapErr){
			console.error('gmAPI.staticMap error');
			console.error(err);
		} else {
			var gmapBase64Doc = new Buffer(imageBody).toString('base64');
			console.log ('===============Google Maps Image - ' + gmapBase64Doc + "=====================Google Maps Image");
		}

		var file1Base64 = app.helpers.getLocalDocument('pdfs/LoanSailboat.docx');
		var file2Base64 = app.helpers.getLocalDocument('pdfs/LoanSailboatAppraiser.docx');

		// create an envelope that will store the document(s), field(s), and recipient(s)
		var envDef = new docusign.EnvelopeDefinition();
		envDef.emailSubject = 'Sailboat Loan Application';
		envDef.emailBlurb = 'Please sign the Loan application to start the application process.';

		// add documents to the envelope
		var doc1 = new docusign.Document();
		doc1.documentBase64 = file1Base64;
		doc1.name = 'Application'; // can be different from actual file name
		doc1.fileExtension ='docx';
		doc1.documentId = '1'; // hardcode so we can easily refer to this document later

		if(!mapErr){
			var doc2 = new docusign.Document();
			doc2.documentBase64 = gmapBase64Doc;
			doc2.name = 'Map'; // can be different from actual file name
			doc2.fileExtension = 'png';
			doc2.documentId = '2'; // hardcode so we can easily refer to this document later
		}

		var doc3 = new docusign.Document();
		doc3.documentBase64 = file2Base64;
		doc3.name = 'Appraiser'; // can be different from actual file name
		doc3.fileExtension = 'docx';
		doc3.documentId = '3'; // hardcode so we can easily refer to this document later

		var docs = [];
		docs.push(doc1);
		if(!mapErr){
			docs.push(doc2);
		}
		docs.push(doc3);
		envDef.documents = docs;

		envDef.enforceSignerVisibility = 'true';

		// Recipients
		var signer = new docusign.Signer();
		signer.routingOrder = 1;
		signer.email = body.inputEmail;
		signer.name = body.inputFirstName + ' ' + body.inputLastName;
		signer.recipientId = '1';
		signer.excludedDocuments = ['3'];

		if(body.inputSigningLocation == 'embedded'){
			signer.clientUserId = '1001';
		}
		if(body.inputAccessCode && body.inputAccessCode.length){
			signer.accessCode = body.inputAccessCode;
		}
		if(body.inputAuthentication == 'phone'){
			app.helpers.addPhoneAuthToRecipient(signer, body.inputPhone);
		}

		var appraiserSigner = new docusign.Signer();
		appraiserSigner.routingOrder = 2;
		appraiserSigner.email = body.inputAppraiserEmail;
		appraiserSigner.name = body.inputAppraiserFirstName + ' ' + body.inputAppraiserLastName;
		appraiserSigner.recipientId = '2';
		// appraiserSigner.setExcludedDocuments([]); // this is NOT the way to make all documents visible, instead we need to add a Tab to each document (if it already has a tag, otherwise un-tagged documents are always visible) 

		if(body.inputSigningLocationAppraiser == 'embedded'){
			appraiserSigner.clientUserId = '2002';
		}
		if(body.inputAccessCodeAppraiser && body.inputAccessCodeAppraiser.length){
			appraiserSigner.accessCode = body.inputAccessCodeAppraiser;
		}
		if(body.inputAuthenticationAppraiser == 'phone'){
			app.helpers.addPhoneAuthToRecipient(appraiserSigner, body.inputAppraiserPhone);
		}

		// Tabs

		// can have multiple tabs, so need to add to envelope as a single element list
		var tabList = {
			text: [],
			email: [],
			fullName: [],
			signHere: [],
			initialHere: [],
			dateSigned: [],
			formula: [],
			attachment: [],
			number: []
		}

		// Note: using anchorStrings (in tabs below) makes documentId and pageNumber irrelevant (they affect all documents and pages)

		// Email
		tabList.email.push(app.helpers.makeTab('Email', {
			recipientId: '1',
			anchorString: 'Applicant Email',
			anchorXOffset: '0',
			anchorYOffset: '0',
			value: body.inputEmail
		}));

		// FullName
		tabList.fullName.push(app.helpers.makeTab('FullName', {
			recipientId: '1',
			anchorString: 'Applicant Full Name',
			anchorXOffset: '0',
			anchorYOffset: '0',
		}));

		// Attachment
		tabList.attachment.push(app.helpers.makeTab('SignerAttachment', {
			recipientId: '1',
			anchorString: 'Please attach',
			anchorXOffset: '0',
			anchorYOffset: '40',
			optional: 'true'
		}));


		// SignHere
		tabList.signHere.push(app.helpers.makeTab('SignHere', {
			recipientId: '1',
			anchorString: 'Applicant Signature',
			anchorXOffset: '0',
			anchorYOffset: '4',
		}));


		// InitialHere
		tabList.initialHere.push(app.helpers.makeTab('InitialHere', {
			recipientId: '1',
			anchorString: 'Applicant Initial',
			anchorXOffset: '0',
			anchorYOffset: '0',
		}));


		var tabs = new docusign.Tabs();
		tabs.textTabs = tabList.text;
		tabs.numberTabs = tabList.number;
		tabs.formulaTabs = tabList.formula;
		tabs.emailTabs = tabList.email;
		tabs.fullNameTabs = tabList.fullName;
		tabs.signerAttachmentTabs = tabList.attachment;
		tabs.signHereTabs = tabList.signHere;
		tabs.initialHereTabs = tabList.initialHere;
		tabs.dateSignedTabs = tabList.dateSigned;

		signer.tabs = tabs;


		// can have multiple tabs, so need to add to envelope as a single element list
		var appraiserTabList = {
			text: [],
			email: [],
			fullName: [],
			signHere: [],
			initialHere: [],
			dateSigned: [],
			formula: [],
			attachment: [],
			number: []
		}
		  

		// Email
		appraiserTabList.email.push(app.helpers.makeTab('Email', {
			recipientId: '2',
			anchorString: 'Appraiser Email',
			anchorXOffset: '0',
			anchorYOffset: '0',
			value: body.inputAppraiserEmail
		}));

		// FullName
		appraiserTabList.fullName.push(app.helpers.makeTab('FullName', {
			recipientId: '2',
			anchorString: 'Appraiser Full Name',
			anchorXOffset: '0',
			anchorYOffset: '0',
		}));

		// Appraisal amount
		appraiserTabList.text.push(app.helpers.makeTab('Text', {
			recipientId: '2',
			anchorString: 'Appraiser Estimate',
			anchorXOffset: '0',
			anchorYOffset: '0',
			locked: 'false'
		}));

		// SignHere
		appraiserTabList.signHere.push(app.helpers.makeTab('SignHere', {
			recipientId: '2',
			anchorString: 'Appraiser Signature',
			anchorXOffset: '0',
			anchorYOffset: '4',
		}));

		// BLANK TEXT (on first document, to make it visible to our Appraiser) 
		appraiserTabList.text.push(app.helpers.makeTab('Text', {
			recipientId: '2',
			documentId: '1',
			pageNumber: '1',
			xPosition: '0',
			yPosition: '0',
			value: '',
			locked: 'true'
		}));


		var appraiserTabs = new docusign.Tabs();
		appraiserTabs.textTabs = appraiserTabList.text;
		appraiserTabs.numberTabs = appraiserTabList.number;
		appraiserTabs.formulaTabs = appraiserTabList.formula;
		appraiserTabs.emailTabs = appraiserTabList.email;
		appraiserTabs.fullNameTabs = appraiserTabList.fullName;
		appraiserTabs.signerAttachmentTabs = appraiserTabList.attachment;
		appraiserTabs.signHereTabs = appraiserTabList.signHere;
		appraiserTabs.initialHereTabs = appraiserTabList.initialHere;
		appraiserTabs.dateSignedTabs = appraiserTabList.dateSigned;

		appraiserSigner.tabs = appraiserTabs;      


		// add recipients
		envDef.recipients = new docusign.Recipients();
		envDef.recipients.signers = [];
		envDef.recipients.signers.push(signer);
		envDef.recipients.signers.push(appraiserSigner);

		// send the envelope by setting |status| to "sent". To save as a draft set to "created"
		// - note that the envelope will only be 'sent' when it reaches the DocuSign server with the 'sent' status (not in the following call)
		envDef.status = 'sent';

		if(app.config.brand_id && app.config.brand_id.length){
			envDef.brandId = app.config.brand_id;
		}

		// set the required authentication information
		let dsApiClient = new docusign.ApiClient();
		dsApiClient.setBasePath(req.session.basePath);
		dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + dsAuthCodeGrant.prototype.getAccessToken());

		// instantiate a new EnvelopesApi object
		var envelopesApi = new docusign.EnvelopesApi(dsApiClient);

		app.helpers.removeEmptyAndNulls(envDef);

		// // pretty printing (no base64 bytes) 
		// var mockEnv = JSON.parse(JSON.stringify(envDef));
		// mockEnv.documents = _.map(mockEnv.documents,function(doc){
		// 	if(doc.documentBase64){
		// 		doc.documentBase64 = '<bytes here>';
		// 	}
		// 	return doc;
		// });
		// console.log(JSON.stringify(mockEnv,null,2));

		// call the createEnvelope() API
		envelopesApi.createEnvelope(req.session.accountId, {envelopeDefinition: envDef}, function (error, envelopeSummary, response) {
			if (error) {
				console.error('Error: ' + response.text);
				res.send('Error creating envelope, please try again');
				return;
			}

			// Create and save envelope locally (temporary)
			app.helpers.createAndSaveLocal(req, envelopeSummary.envelopeId)
			.then(function(){

				req.session.remainingSigners = [];

				if(body.inputSigningLocationAppraiser == 'embedded'){
					req.session.remainingSigners.push(appraiserSigner);
				} else {
					req.session.remainingSigners.push('remote-signer');
				}

				req.session.remainingSigners.push('remote-signer'); // last signer is remote (employee) 

				if(body.inputSigningLocation == 'embedded'){
					app.helpers.getRecipientUrl(req, envelopeSummary.envelopeId, signer, function(err, data){
						if(err){
							res.send('Error with getRecipientUrl, please try again');
							return console.error(err);
						}

						req.session.envelopeId = envelopeSummary.envelopeId;
						req.session.signingUrl = data.url;

						res.redirect('/sign/embedded');


					});
				} else {
					res.redirect('/sign/remote');
				}
			});

		});


	});

});

module.exports = router;

