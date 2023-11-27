var express = require('express');
var router = express.Router();

var _ = require('lodash');

var docusign = require('docusign-esign'),
  async = require('async'),
  fs = require('fs'),
  path = require('path'),
  dsAuthCodeGrant = require('../DSAuthCodeGrant');

router.get('/loan/personal', function(req, res, next) {
  //   let tokenOK = dsAuthCodeGrant.prototype.checkToken(3);
	// var isRedirected = res.locals.session.isRedirected;
	// res.locals.session.isRedirected = false;

  //   if (!isRedirected && !tokenOK) {
	// 	req.session.loan = 'personal';
	// 	res.locals.session.loan = 'personal';
	// 	dsAuthCodeGrant.prototype.login(req, res, next)
	// } else {
		res.render('loan-personal', {
			signing_location_options: app.helpers.signing_location_options,
			authentication_options: app.helpers.authentication_options,
			signing_url: res.locals.session.signingUrl,
			client_id: res.locals.session.clientId,
		});
	// }
});

router.post('/loan/personal', function(req, res, next) {

	console.log ('Starting processing of personal loan information');

	var body = req.body;

	// set the required authentication information
	let dsApiClient = new docusign.ApiClient();
	dsApiClient.setBasePath(req.session.basePath);
  console.log("AUTH CREDS\n");
  console.log(req.session.accountId);
  console.log('\n');
  console.log(req.session.access_token);
  console.log('\n');
  console.log(req.session.basePath);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.session.access_token);

	// instantiate a new EnvelopesApi object
	var envelopesApi = new docusign.EnvelopesApi(dsApiClient);

	// create an envelope that will store the document(s), field(s), and recipient(s)
	var envDef = new docusign.EnvelopeDefinition();
	envDef.emailSubject = 'Personal Loan Application';
	envDef.emailBlurb = 'Please sign the Loan application to start the application process.';

	// add a document to the envelope
	var doc = new docusign.Document();
	var file1Base64 = app.helpers.getLocalDocument('pdfs/LoanPersonal.docx');
	// var base64Doc = new Buffer(file1Base64).toString('base64');
	doc.documentBase64 = file1Base64;
	doc.name = 'Document' ; // can be different from actual file name
	doc.fileExtension = 'docx';
	doc.documentId = '1'; // hardcode so we can easily refer to this document later

	var docs = [];
	docs.push(doc);
	envDef.documents = docs;


	// Recipient
	var signer = new docusign.Signer();
	signer.email = body.inputEmail;
	signer.name = body.inputFirstName + ' ' + body.inputLastName;
	signer.recipientId = '1';
	if(body.inputSigningLocation == 'embedded'){
		signer.clientUserId = '1001';
	}
	if(body.inputAuthentication == 'phone'){
		app.helpers.addPhoneAuthToRecipient(signer, body.inputPhone);
	}
	if(body.inputAccessCode && body.inputAccessCode.length){
		signer.accessCode = body.inputAccessCode;
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

	// Note: using anchorStrings (in tabs below) makes documentId and pageNumber irrelevant (they affect all documents and pages)

	// FullName
	tabList.fullName.push(app.helpers.makeTab('FullName', {
		recipientId: '1',
		anchorString: 'Name',
		anchorXOffset: '58',
		anchorYOffset: '-2',
		locked: 'false'
	}));

	// Email
	tabList.email.push(app.helpers.makeTab('Email', {
		recipientId: '1',
		name: 'Email',
		tabLabel: 'Email',
		anchorString: 'Email',
		anchorXOffset: '55',
		anchorYOffset: '-2',
		value: body.inputEmail
	}));

	// Phone
	tabList.text.push(app.helpers.makeTab('Text', {
		recipientId: '1',
		name: 'Phone',
		tabLabel: 'Phone',
		anchorString: 'Phone',
		anchorXOffset: '65',
		anchorYOffset: '-2',
		value: body.inputPhone,
		locked: 'false',
	}));

	// Address Line 1
	tabList.text.push(app.helpers.makeTab('Text', {
		recipientId: '1',
		name: 'AddressLine1',
		tabLabel: 'AddressLine1',
		anchorString: 'Address',
		anchorXOffset: '80',
		anchorYOffset: '-2',
		value: body.inputAddress1,
		locked: 'false',
	}));

	// Address Line 2
	tabList.text.push(app.helpers.makeTab('Text', {
		recipientId: '1',
		name: 'AddressLine2',
		tabLabel: 'AddressLine2',
		anchorString: 'Address',
		anchorXOffset: '80',
		anchorYOffset: '20',
		value: body.inputAddress2,
		required: 'false',
		locked: 'false',
	}));

	// Address city/state/zip
	tabList.text.push(app.helpers.makeTab('Text', {
		recipientId: '1',
		name: 'AddressCityStateZip',
		tabLabel: 'AddressCityStateZip',
		anchorString: 'Address',
		anchorXOffset: '80',
		anchorYOffset: '40',
		value: body.inputCity + ', ' + body.inputState + ' ' + body.inputZip,
		locked: 'false',
	}));

	// Amount
	tabList.number.push(app.helpers.makeTab('Text', {
		recipientId: '1',
		name: 'Amount',
		tabLabel: 'Amount',
		anchorString: 'Amount',
		anchorXOffset: '75',
		anchorYOffset: '-2',
		locked: 'false',
		value: body.inputLoanAmount
	}));

	// Payment payback period (months)
	tabList.number.push(app.helpers.makeTab('Text', {
		recipientId: '1',
		name: 'PaymentDuration',
		tabLabel: 'PaymentDuration',
		anchorString: 'Payment Duration',
		anchorXOffset: '150',
		anchorYOffset: '-2',
		locked: 'false',
		value: body.inputLoanLength
	}));

	// Monthly payments (calculated field)
	tabList.formula.push(app.helpers.makeTab('FormulaTab', {
		recipientId: '1',
		name: 'MonthlyPayment',
		tabLabel: 'MonthlyPayment',
		anchorString: 'Monthly Payment',
		anchorXOffset: '180',
		anchorYOffset: '-2',
		formula: '[Amount]/[PaymentDuration]'
	}));


	// SignHere
	tabList.signHere.push(app.helpers.makeTab('SignHere', {
		recipientId: '1',
		anchorString: 'DocuSign API rocks',
		anchorXOffset: '10',
		anchorYOffset: '40',
	}));


	var tabs = new docusign.Tabs();
	tabs.textTabs = tabList.text;
	tabs.numberTabs = tabList.number;
	tabs.formulaTabs = tabList.formula;
	tabs.emailTabs = tabList.email;
	tabs.fullNameTabs = tabList.fullName;
	tabs.signHereTabs = tabList.signHere;
	tabs.initialHereTabs = tabList.initialHere;
	tabs.dateSignedTabs = tabList.dateSigned;

	signer.tabs= tabs;

	// add recipients (in this case a single signer) to the envelope
	envDef.recipients = new docusign.Recipients();
	envDef.recipients.signers = [];
	envDef.recipients.signers.push(signer);

	// send the envelope by setting |status| to "sent". To save as a draft set to "created"
	// - note that the envelope will only be 'sent' when it reaches the DocuSign server with the 'sent' status (not in the following call)
	envDef.status = 'sent';

	app.helpers.removeEmptyAndNulls(envDef);

	// call the createEnvelope() API
	envelopesApi.createEnvelope(req.session.accountId, {envelopeDefinition: envDef}, function (error, envelopeSummary, response) {
		if (error) {
			console.error('Error: ' + response.text);
			res.send('Error creating envelope, please try again');
			return;
		}

		// Create and save envelope locally (temporary)
		console.log('envelope created with envelopeID = ' + envelopeSummary.envelopeId);
		app.helpers.createAndSaveLocal(req, envelopeSummary.envelopeId)
		.then(function(){

			if(body.inputSigningLocation == 'embedded'){
				app.helpers.getRecipientUrl(req, envelopeSummary.envelopeId, signer, function(err, data){
					if(err){
						res.send('Error with getRecipientUrl, please try again');
						return console.error(err);
					}

					res.locals.session.signingUrl = data.url;
					res.locals.session.isRedirected = true;
					res.locals.session.clientId = process.env.DOCUSIGN_IK;

					res.redirect('/loan/personal');
				});
			} else {
				res.redirect('/sign/remote');
			}
		});

	});
});


module.exports = router;
