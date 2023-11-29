
var docusign = require('docusign-esign');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var config = {};

// Load .env if exists
try {
  if(fs.statSync(path.join(__dirname,'.env')).isFile()){
    require('dotenv').config();
  }
}catch(err){
  console.info('Not including .env');
}

var docusignEnv = process.env.DOCUSIGN_ENVIRONMENT;
var docusignBaseUrl = 'https://' + docusignEnv + '.docusign.net/restapi';

config.auth = {
	IntegrationKey: process.env.DOCUSIGN_IK,
	ClientSecret: process.env.DOCUSIGN_CLIENT_SECRET,
  RSAKey: fs.readFileSync("./rsa.txt"),
  AccountId: process.env.DOCUSIGN_ACCOUNT_ID,
  UserId: process.env.DOCUSIGN_USER_ID,
	EmployeeEmail: process.env.EMPLOYEE_EMAIL,
	EmployeeName: process.env.EMPLOYEE_NAME,
	LocalReturnUrl: process.env.LOCAL_RETURN_URL
};

config.brand_id = process.env.BRAND_ID;
config.google_maps_api_key = process.env.GOOGLE_MAPS_API_KEY;
config.default_email = process.env.DEFAULT_EMAIL;
config.session_secret = process.env.SESSION_SECRET;

app.locals.googletag = process.env.GOOGLE_TAG_MANAGER;

config.templates = [
	{
		key: 'cosigner_on_auto_loan',
		name: 'Auto Loan with Cosigner',
		json: require('./pdfs/template-auto-loan.json') // import the name of the template, see if one exists already
	}
];
config.templatesByKey = {};
_.each(config.templates, function(template){
	config.templatesByKey[template.key] = template; // app.config.templatesByKey.cosigner_on_auto_loan = {...}
});

config.ApiClient = null; // will be created in a moment

module.exports = config;
