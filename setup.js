var docusign = require('docusign-esign');
var Q = require('q');
var _ = require('lodash');
var dsAuthCodeGrant = require('./DSAuthCodeGrant');

var setup = {};

setup.Templates = function(req, next){
  // Ensure template exists (with an exact name)
  // - create if not exists, using local json

	// set the required authentication information
	let dsApiClient = new docusign.ApiClient();
	dsApiClient.setBasePath(req.session.basePath);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + dsAuthCodeGrant.prototype.getAccessToken());

	// instantiate a new TemplatesApi object
  var templatesApi = new docusign.TemplatesApi(dsApiClient);
  templatesApi.listTemplates(req.session.accountId, function (error, templateList, response) {

    var promises = [];

    // iterate over config.templates
    _.each(app.config.templates, function(templateObj){

      var templateDef = Q.defer();
      promises.push(templateDef.promise);

      var template = _.find(templateList.envelopeTemplates, {name: templateObj.name});

      if(template){
        app.config.templatesByKey[templateObj.key].id = template.templateId;
        console.log('--Template Exists--');
        templateDef.resolve();
      } else {
        console.log('--Template Creating--');
        setup.InsertTemplate(req, templateObj)
        .then(templateDef.resolve);
      }

    });

    Q.all(promises)
    .then(function(){
      console.log('--All template saving done--');
      next(null); //, template.templateId);
    });

  });
}

setup.InsertTemplate = function(req, templateObj){

    var def = Q.defer();

    var templateJson = templateObj.json;

    delete templateJson.templateId; // use a unique template ID
    templateJson.name = templateObj.name;
    templateJson.envelopeTemplateDefinition = {}; // required, but fine to be empty

    // load json into constructor
    var templateDef = new docusign.EnvelopeTemplateDefinition();
    try {
      var template = new docusign.EnvelopeTemplate.constructFromObject(templateJson);
    }catch(err){
      console.error(err.stack);
      def.resolve();
      return def.promise;
    }

    app.helpers.removeEmptyAndNulls(template);

    // set the required authentication information
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(req.session.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + dsAuthCodeGrant.prototype.getAccessToken());

    var templatesApi = new docusign.TemplatesApi(dsApiClient);
    templatesApi.createTemplate(req.session.accountId, {envelopeTemplate:template}, function (err, templateList, response) {
      if(err){
        def.reject();
        return console.error(err.response.error);
      }

      console.log('Saved template!');
      def.resolve();

    });

    return def.promise;

}


module.exports = setup;
