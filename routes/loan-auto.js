var express = require('express');
var router = express.Router();

var _ = require('lodash');

var docusign = require('docusign-esign'),
  async = require('async'),
  fs = require('fs'),
  path = require('path');
  dsAuthCodeGrant = require('../DSAuthCodeGrant');

router.get('/loan/auto', function(req, res, next) {
    let tokenOK = dsAuthCodeGrant.prototype.checkToken(3);
    if (! tokenOK) {
		req.session.loan = 'auto';
		dsAuthCodeGrant.prototype.login(req, res, next)    
	}
	else {	
		res.render('loan-auto', {
			signing_location_options: app.helpers.signing_location_options,
			authentication_options: app.helpers.authentication_options
		});
	}
});

router.post('/loan/auto', function(req, res, next) {

	// this loan requires a DocuSign template before we can process it
	// Check for template existance
  app.setup.Templates(req, function(err){
    if(err){
      console.log('Templates Error');
	  console.error(err.text);
	}
	else 
	{
		console.log ('Starting processing of auto loan information');
		var body = req.body;
	
		// set the required authentication information
		let dsApiClient = new docusign.ApiClient();
		dsApiClient.setBasePath(req.session.basePath);
		dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + dsAuthCodeGrant.prototype.getAccessToken());
		
		// instantiate a new EnvelopesApi object
		var envelopesApi = new docusign.EnvelopesApi(dsApiClient);
		
		// create an envelope that will store the document(s), field(s), and recipient(s)
		var envDef = new docusign.EnvelopeDefinition();
		envDef.emailSubject ='Auto Loan Application';
		envDef.emailBlurb = 'Please sign the Loan application to start the application process.';
		envDef.templateId = app.config.templatesByKey.cosigner_on_auto_loan.id;
	
		// create a template role with a valid templateId and roleName and assign signer info
		var tRoleApplicant = new docusign.TemplateRole();
		// tRoleApplicant.recipientId = "1";
		tRoleApplicant.roleName ='applicant';
		tRoleApplicant.name = body.inputFirstName + ' ' + body.inputLastName;
		tRoleApplicant.email = body.inputEmail;
		if(body.inputSigningLocation == 'embedded'){
			tRoleApplicant.clientUserId = '1001';
		}
		if(body.inputAccessCode && body.inputAccessCode.length){
			tRoleApplicant.accessCode = body.inputAccessCode;
		}
		if(body.inputAuthentication == 'phone'){
			app.helpers.addPhoneAuthToRecipient(tRoleApplicant, body.inputPhone);
		}
	
		var tabList = {
			text: [],
			number: []
		};
		tabList.text.push(app.helpers.makeTab('Text', {
			tabLabel: 'Phone',
			value: body.inputPhone
		}));
		tabList.number.push(app.helpers.makeTab('Text', {
			tabLabel: 'Amount',
			value: body.inputLoanAmount
		}));
		tabList.number.push(app.helpers.makeTab('Text', {
			tabLabel: 'Duration',
			value: body.inputLoanLength
		}));
		
	
		// Set default Tab values in template
		var tabs = new docusign.TemplateTabs();
		tabs.textTabs = tabList.text;
		tabs.numberTabs = tabList.number;
		tRoleApplicant.tabs = tabs;
	
	
		var tRoleCosigner = new docusign.TemplateRole();
		if(body.inputCosignerCheckbox){
			tRoleCosigner.roleName = 'cosigner';
			tRoleCosigner.name = body.inputCosignerFirstName + ' ' + body.inputCosignerLastName;
			tRoleCosigner.email = body.inputCosignerEmail;
			if(body.inputSigningLocationCosigner == 'embedded'){
				tRoleCosigner.clientUserId = '2002';
			}
			if(body.inputAccessCodeCosigner && body.inputAccessCodeCosigner.length){
				tRoleCosigner.accessCode = body.inputAccessCodeCosigner;
			}
			if(body.inputAuthenticationCosigner == 'phone'){
				app.helpers.addPhoneAuthToRecipient(tRoleCosigner, body.inputCosignerPhone);
			}
	
			var tabListCosigner = {
				text: []
			};
			tabListCosigner.text.push(app.helpers.makeTab('Text', {
				tabLabel: 'PhoneCosigner',
				value: body.inputCosignerPhone
			}));
	
			// Set default Tab values in template
			var tabsCosigner = new docusign.TemplateTabs();
			tabsCosigner.textTabs = tabListCosigner.text;
			tRoleCosigner.tabs = tabsCosigner;
	
		}
	
		var tRoleEmployee = new docusign.TemplateRole();
		tRoleEmployee.roleName = 'employee';
		tRoleEmployee.name = app.config.auth.EmployeeName;
		tRoleEmployee.email = app.config.auth.EmployeeEmail;
	
		// create a list of template roles and add our newly created role
		var templateRolesList = [];
		templateRolesList.push(tRoleApplicant);
		if(body.inputCosignerCheckbox){
			templateRolesList.push(tRoleCosigner);
		}
		templateRolesList.push(tRoleEmployee);
	
		// assign template role(s) to the envelope
		envDef.templateRoles = templateRolesList;
	
		// send the envelope by setting |status| to "sent". To save as a draft set to "created"
		// - note that the envelope will only be 'sent' when it reaches the DocuSign server with the 'sent' status (not in the following call)
		envDef.status = 'sent';
	
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
	
				if(body.inputSigningLocation == 'embedded'){
					var tApplicantRecipient = {
						recipientId: _.find(app.config.templatesByKey.cosigner_on_auto_loan.json.recipients.signers,{roleName: 'applicant'}).recipientId,
						clientUserId: tRoleApplicant.clientUserId,
						name: tRoleApplicant.name,
						email: tRoleApplicant.email
					};
				}
				if(body.inputCosignerCheckbox){
					if(body.inputSigningLocationCosigner == 'embedded'){
						var tCoSignerRecipient = {
							recipientId: _.find(app.config.templatesByKey.cosigner_on_auto_loan.json.recipients.signers,{roleName: 'cosigner'}).recipientId,
							clientUserId: tRoleCosigner.clientUserId,
							name: tRoleCosigner.name,
							email: tRoleCosigner.email
						}
						req.session.remainingSigners.push(tCoSignerRecipient);
					} else {
						req.session.remainingSigners.push('remote-signer');
					}
				}
	
				req.session.remainingSigners.push('remote-signer'); // last signer is remote (employee) 
	
				if(body.inputSigningLocation == 'embedded'){
					app.helpers.getRecipientUrl(req, envelopeSummary.envelopeId, tApplicantRecipient, function(err, data){
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
		
	}
	});
});


module.exports = router;

