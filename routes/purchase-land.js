var express = require('express');
var router = express.Router();

var _ = require('lodash');

var docusign = require('docusign-esign'),
  async = require('async'),
  fs = require('fs'),
  path = require('path');

router.get('/purchase/land', function(req, res, next) {
	res.render('purchase-land', {
		signing_location_options: app.helpers.signing_location_options,
		authentication_options: app.helpers.authentication_options
	});
});

router.post('/purchase/land', function(req, res, next) {
	// console.log('BODY:', typeof req.body, req.body.inputEmail, req.body);

	var body = req.body;

	// create an envelope that will store the document(s), field(s), and recipient(s)
	var envDef = new docusign.EnvelopeDefinition();
	envDef.setEmailSubject('Land Purchase Agreement');
	envDef.setEmailBlurb('Please sign the Agreement');

	// add a document to the envelope
	var doc = new docusign.Document();
	var file1Base64 = app.helpers.getLocalDocument('pdfs/PurchaseLand.docx');
	// var base64Doc = new Buffer(file1Base64).toString('base64');
	doc.setDocumentBase64(file1Base64);
	doc.setName('Document'); // can be different from actual file name
	doc.setFileExtension('docx');
	doc.setDocumentId('1'); // hardcode so we can easily refer to this document later

	var docs = [];
	docs.push(doc);
	envDef.setDocuments(docs);


	// Recipient 1 (purchaser, in-person signature)
	var signer = new docusign.InPersonSigner();
	signer.setHostName(body.inputSalesFirstName + ' ' + body.inputSalesLastName); // use for focused view signing!
	signer.setHostEmail(body.inputSalesEmail); // use for focused view signing!
	signer.setSignerEmail(body.inputPurchaserEmail);
	signer.setSignerName(body.inputPurchaserFirstName + ' ' + body.inputPurchaserLastName);
	signer.setRecipientId('1');
	signer.setRoutingOrder('1');

	if(body.inputSigningLocation == 'embedded'){
		signer.setClientUserId('1001');
	}
	// if(body.inputAuthentication == 'phone'){
	// 	app.helpers.addPhoneAuthToRecipient(signer, body.inputPhone);
	// }
	// if(body.inputAccessCode && body.inputAccessCode.length){
	// 	signer.setAccessCode(body.inputAccessCode);
	// }

	// Recipient 2 (developer, remote, print and sign force-able)
	var signer2 = new docusign.Signer();
	signer2.setEmail(body.inputDevEmail);
	signer2.setName(body.inputDevFirstName + ' ' + body.inputDevLastName);
	signer2.setRecipientId('2');
	signer2.setRoutingOrder('2');
	if(body.inputDevForceWet){
		// app.helpers.addPhoneAuthToRecipient(signer2, body.inputPhone);
		signer2.setRequireSignOnPaper('true');
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
		number: []
	}
	var tabList2 = {
		text: [],
		email: [],
		fullName: [],
		signHere: [],
		initialHere: [],
		dateSigned: [],
		formula: [],
		number: []
	}

	// Note: using anchorStrings (in tabs below) makes documentId and pageNumber irrelevant (they affect all documents and pages)

	// Recipient 1 (Purchaser)

	// FullName
	tabList.fullName.push(app.helpers.makeTab('FullName', {
		recipientId: '1',
		anchorString: 'Purchaser Full Name',
		anchorXOffset: '178',
		anchorYOffset: '-2',
		locked: 'false'
	}));

	// Email
	tabList.email.push(app.helpers.makeTab('Email', {
		recipientId: '1',
		name: 'Email',
		tabLabel: 'Email',
		anchorString: 'Purchaser Email',
		anchorXOffset: '155',
		anchorYOffset: '-2',
		value: body.inputPurchaserEmail
	}));

	// SignHere
	tabList.signHere.push(app.helpers.makeTab('SignHere', {
		recipientId: '1',
		anchorString: 'Purchaser Signature',
		anchorXOffset: '178',
		anchorYOffset: '14',
	}));

	// Amount
	tabList.number.push(app.helpers.makeTab('Number', {
		recipientId: '1',
		name: 'LandCost',
		tabLabel: 'LandCost',
		anchorString: 'Land Cost',
		anchorXOffset: '105',
		anchorYOffset: '-2',
		locked: 'true',
		value: body.inputLandCost
	}));



	// Recipient 2 (Developer)

	// FullName
	tabList2.fullName.push(app.helpers.makeTab('FullName', {
		recipientId: '2',
		anchorString: 'Developer Full Name',
		anchorXOffset: '178',
		anchorYOffset: '-2',
		locked: 'false'
	}));

	// Email
	tabList2.email.push(app.helpers.makeTab('Email', {
		recipientId: '2',
		name: 'Email',
		tabLabel: 'Email',
		anchorString: 'Developer Email',
		anchorXOffset: '155',
		anchorYOffset: '-2',
		value: body.inputDevEmail
	}));

	// SignHere
	tabList2.signHere.push(app.helpers.makeTab('SignHere', {
		recipientId: '2',
		anchorString: 'Developer Signature',
		anchorXOffset: '158',
		anchorYOffset: '14',
	}));


	var tabs = new docusign.Tabs();
	tabs.setTextTabs(tabList.text);
	tabs.setNumberTabs(tabList.number);
	tabs.setFormulaTabs(tabList.formula);
	tabs.setEmailTabs(tabList.email);
	tabs.setFullNameTabs(tabList.fullName);
	tabs.setSignHereTabs(tabList.signHere);
	tabs.setInitialHereTabs(tabList.initialHere);
	tabs.setDateSignedTabs(tabList.dateSigned);

	signer.setTabs(tabs);

	var tabs2 = new docusign.Tabs();
	tabs2.setTextTabs(tabList2.text);
	tabs2.setNumberTabs(tabList2.number);
	tabs2.setFormulaTabs(tabList2.formula);
	tabs2.setEmailTabs(tabList2.email);
	tabs2.setFullNameTabs(tabList2.fullName);
	tabs2.setSignHereTabs(tabList2.signHere);
	tabs2.setInitialHereTabs(tabList2.initialHere);
	tabs2.setDateSignedTabs(tabList2.dateSigned);

	signer2.setTabs(tabs2);

	// add recipients (in this case a single signer) to the envelope
	envDef.setRecipients(new docusign.Recipients());
	envDef.getRecipients().setInPersonSigners([]);
	envDef.getRecipients().getInPersonSigners().push(signer);
	envDef.getRecipients().getSigners().push(signer2);

	// send the envelope by setting |status| to "sent". To save as a draft set to "created"
	// - note that the envelope will only be 'sent' when it reaches the DocuSign server with the 'sent' status (not in the following call)
	envDef.setStatus('sent');

	// instantiate a new EnvelopesApi object
	var envelopesApi = new docusign.EnvelopesApi();

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
	envelopesApi.createEnvelope(app.config.auth.AccountId, envDef, null, function (error, envelopeSummary, response) {
		if (error) {
			console.error('Error: ', response.error);
			console.error(envelopeSummary);
			res.send('Error creating envelope, please try again');
			return;
		}

		// Create and save envelope locally (temporary)
		app.helpers.createAndSaveLocal(req, envelopeSummary.envelopeId)
		.then(function(){

			req.session.remainingSigners = [];
			req.session.remainingSigners.push('remote-signer');

			if(body.inputSigningLocation == 'embedded'){
				app.helpers.getRecipientUrl(envelopeSummary.envelopeId, signer, function(err, data){
					if(err){
						res.send('Error with getRecipientUrl, please try again');
						return console.error(err);
					}

					req.session.envelopeId = envelopeSummary.envelopeId;
					req.session.signingUrl = data.getUrl();

					res.redirect('/sign/embedded');


				});
			} else {
				res.redirect('/sign/remote');
			}
		});

	});
});

module.exports = router;
