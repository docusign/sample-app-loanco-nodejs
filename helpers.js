
var docusign = require('docusign-esign');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var Q = require('q');
var dsAuthCodeGrant = require('./DSAuthCodeGrant');


var helpers = {};


helpers.signing_location_options = ['embedded (focused view)', 'remote'];
helpers.authentication_options = ['none','phone','idcheck'];

helpers.makeTab = function makeTab(type, data) {
  // https://developers.docusign.com/esign-rest-api/reference/Envelopes/EnvelopeRecipientTabs

  // SignHere
  // Custom
  // FullName
  // InitialHere
  // InitialHereOptional
  // etc.

  let tab = docusign[type].constructFromObject(data);
  return tab;
}

helpers.getLocalDocument = function getLocalDocument(filepath){

    // create a byte array that will hold our document bytes
    var fileBytes = null;
    try {
      // read file from a local directory
      fileBytes = fs.readFileSync(path.resolve(filepath));
    } catch (ex) {
      // handle error
      console.log('Exception: ' + ex);
      return;
    }

    var base64Doc = new Buffer(fileBytes).toString('base64');

    return base64Doc;

}

helpers.getRecipientUrl = function getRecipientUrl(req, envelopeId, recipient, callback){

  // set the url where you want the recipient to go once they are done signing
    // - this can be used by your app to watch the URL and detect when signing has completed (or was canceled)
    var recipientViewRequest = new docusign.RecipientViewRequest();
    recipientViewRequest.returnUrl = `${app.config.auth.LocalReturnUrl}`;
    recipientViewRequest.authenticationMethod = 'email';

    // recipient information must match embedded recipient info we provided
    recipientViewRequest.userName = recipient.name || recipient.hostName;
    recipientViewRequest.email = recipient.email || recipient.hostEmail;
    recipientViewRequest.clientUserId = recipient.clientUserId;
    recipientViewRequest.pingFrequency = "60";
    recipientViewRequest.pingUrl = app.config.auth.LocalReturnUrl;
    recipientViewRequest.frameAncestors = [app.config.auth.LocalReturnUrl, 'https://apps-d.docusign.com'];
    recipientViewRequest.messageOrigins = ['https://apps-d.docusign.com'];
    app.helpers.removeEmptyAndNulls(recipientViewRequest);

    // set the required authentication information
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(req.session.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + dsAuthCodeGrant.prototype.getAccessToken());

    // instantiate a new EnvelopesApi object
    var envelopesApi = new docusign.EnvelopesApi(dsApiClient);

    // console.log(JSON.stringify(returnUrl,null,2));

    // call the CreateRecipientView API
    envelopesApi.createRecipientView(req.session.accountId, envelopeId, {recipientViewRequest: recipientViewRequest}, function (error, recipientView, response) {
      if (error) {
        console.log('createRecipientView Error');
        // console.error(error.error);
        console.error(response.body);
        return;
      }

      if (recipientView) {
        console.log('ViewUrl: ' + JSON.stringify(recipientView));
        callback(null, recipientView);

      }
    });

}

helpers.removeEmptyAndNulls = function removeEmptyAndNulls(obj, hideBase64){
  // the API does not allow null values in many places
  var removed = false;
  if (obj) {
    var isArray = obj instanceof Array;
    Object.keys(obj).forEach(function(k) {
      if (_.isEmpty(obj[k])){
        if(isArray){
          obj.splice(k, 1);
          removed = true;
        } else {
          delete obj[k];
          removed = true;
        }
      } else if (typeof obj[k] === "object"){
        removeEmptyAndNulls(obj[k], hideBase64);
      }
      if (isArray && obj.length === k){
        removeEmptyAndNulls(obj, hideBase64);
      }
    });
  }
  if(removed){
    // run again
    removeEmptyAndNulls(obj, hideBase64);
  }
  return obj;
}

helpers.createAndSaveLocal = function createAndSaveLocal(req, envelopeId){
  // saving the envelope locally
  var def = Q.defer();

	// set the required authentication information
	let dsApiClient = new docusign.ApiClient();
	dsApiClient.setBasePath(req.session.basePath);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + dsAuthCodeGrant.prototype.getAccessToken());

	// instantiate a new EnvelopesApi object
	var envelopesApi = new docusign.EnvelopesApi(dsApiClient);

    // Request the envelope
  // - not including the documents yet
  envelopesApi.getEnvelope(req.session.accountId, envelopeId, {include: false}, function (error, envelopeSummary, response) {

    // get the document information
    envelopesApi.listDocuments(req.session.accountId, envelopeId, function (error, documents, response) {
      if (error) {
        console.log('Error: ' + error);
        console.log('Response: ' + response.text);
        def.reject();
        return;
      }

      // get the recipients
      envelopesApi.listRecipients(req.session.accountId, envelopeId, function (error, recipients, response) {
        if (error) {
          console.log('Error: ' + error);
          console.log('Response: ' + response.text);
          def.reject();
          return;
        }

        var localEnv = {
          userId: req.user?.sub,
          envelopeId: envelopeSummary.envelopeId,
          data: envelopeSummary, // this will be updated throughout the lifecycle
          documents: documents.envelopeDocuments,
          recipients: recipients,
          lastUpdate: new Date().getTime()
        };
        app.models.Envelope.insert(localEnv, function (err, newLocalEnv) {
          def.resolve(newLocalEnv);
        });

      });

    });

  });

  return def.promise;
}



helpers.addPhoneAuthToRecipient = function addPhoneAuthToRecipient(recipient, phonenumber){
  // Not enabled in demo
  recipient.setRequireIdLookup(true);
  recipient.setIdCheckConfigurationName("Phone Auth $");

  var phoneAuth = new docusign.RecipientPhoneAuthentication();
  phoneAuth.setSenderProvidedNumbers([phonenumber]);
  phoneAuth.setRecipMayProvideNumber(true);
  phoneAuth.setRecordVoicePrint(true);

  recipient.setPhoneAuthentication(phoneAuth);

  return recipient;
}


helpers.addIDLookupToRecipient = function addIDLookupToRecipient(recipient, address1, address2, city, state, zip){
  // Not enabled in demo
  recipient.setRequireIdLookup(true);
  recipient.setIdCheckConfigurationName('ID Check $');

  var addressInformation = new docusign.AddressInformation();
  addressInformation.setStreet1(address1);
  addressInformation.setStreet2(address2);
  addressInformation.setCity(city);
  addressInformation.setState(state);
  addressInformation.setZip(zip);

  var addressInformationInput = new docusign.AddressInformationInput();
  addressInformationInput.setDisplayLevel('Editable');
  addressInformationInput.setReceiveInResponse(true);
  addressInformationInput.setAddressInformation(addressInformation);

  var IDCheckInformationInput = new docusign.IDCheckInformationInput();
  IDCheckInformationInput.setAddressInformationInput();

  recipient.setIDCheckInformationInput(IDCheckInformationInput);

  return recipient;

}


module.exports = helpers;