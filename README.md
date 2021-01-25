
### DocuSign LoanCo Sample App 

LoanCo is a sample loan app that shows some common ways an application might interact with the DocuSign eSignature API. Various switches (authentication, embedded signing, templates) can be changed to show additional platform and API features and how easy they are to add to your own solution. LoanCo offers three (3) different loan workflows that demonstrate various features and workflows available through the platform.

#### Requirements

- [Free Developer Account](https://go.docusign.com/o/sandbox)
- [Node.js](https://nodejs.org/en/)


#### Installation 

	git clone <repo> 
	cd <repo directory>
	npm install

#### Running 

	npm start
	

#### Configuration 

> DocuSign has multiple ways of authenticating your app. This example is using Code Grant, which requires us to store a ClientSecret in addition to the Integration Key. read more about different authentication methods at https://developers.docusign.com/esign-rest-api/guides/authentication


We use environment variables to setup our configuration. You can store these variables in a `.env` file at the root (`dotenv` package is used) 

	DOCUSIGN_ENVIRONMENT=demo  // use "www" for production  
	DOCUSIGN_IK=               // Integration Key 
    DOCUSIGN_CLIENT_SECRET=    // Client Secret
	EMPLOYEE_EMAIL=            // used for final recipient of Personal Loan
	EMPLOYEE_NAME=             // used for final recipient of Personal Loan
	LOCAL_RETURN_URL=http://localhost/   // change to the correct return url, with a trailing slash
	BRAND_ID=                  // not required, use to show a different Brand for the Sailboat example 
	GOOGLE_MAPS_API_KEY=       // required for Sailboat example to work
    GOOGLE_TAG_MANAGER=        // GTM-XYZ
	DEFAULT_EMAIL=             // for autofilling email input fields
    FORCE_HTTPS=               // force https by setting to true
    SESSION_SECRET=            // used to compute the hash value of the session, any number would do.

#### Using an https server
*Optional*
1. Follow [these instructions](https://devcenter.heroku.com/articles/ssl-certificate-self) to generate a private key, certificate signing request, and SSL certificate. These should be stored in the root directory in files named server.key, server.csr, and server.crt respectively.

#### Templates 

Templates are not currently automatically created. To create the Auto Loan template, follow these steps: 

1. Visit your Templates tab: https://appdemo.docusign.com/templates  
1. Click "New" and "Upload Template" 
1. Upload the file "pdfs/template-auto-loan.json" and click on the newly-created Template 
1. Copy the Template ID by clicking the "(I)" or information icon next to the Template title 
1. Paste the Template ID into the "pdfs/template-auto-loan.json" file, replacing the existing templateId value 
1. Restart the sample using `npm start`  

> Todo: When initially run, the app will attempt to create a Template for the Auto Loan Application. This template is defined at `pdfs/template-auto-loan.json`. 


#### Deploy to Heroku 

A few requirements:

- Make sure you have the heroku toolbelt/CLI installed locally  
- Fill out the fields in the `.env` file after cloning 
- Install heroku-config to send your local env variables in .env to heroku (`heroku plugins:install heroku-config`)  


Code:  

    git clone <repo>
    cd <repo directory>

    # <fill out fields in .env file>

    # create heroku app
    heroku create    

    # test locally
    heroku local

    # push up .env file to heroku config (heroku plugins:install heroku-config)
    heroku config:push

    # push repo up to heroku 
    git push heroku master

    # view online
    heroku open
    


#### Errors you may encounter  

    { 
        errorCode: 'ACCOUNT_LACKS_PERMISSIONS',
        message: 'This Account lacks sufficient permissions. Document Visibility has been specified.  This account does not have document visibility turned on.' 
    }

Change this setting: http://imgur.com/j4VD6nd on https://admindemo.docusign.com/sending-settings



    {
        errorCode: 'PLAN_ITEM_NOT_ENABLED',
        message: 'A requested plan item is not enabled for this account. Plan item: AllowRequireWetSign' 
    }

Contact Support (support@docusign.com) and request "Allow Require Wet Sign" to be enable on your account, and then change this setting: http://imgur.com/a/mJ5WC on https://admindemo.docusign.com/signing-settings under "Recipients" 



#### Additional Resources

* [DocuSign Developer Center](https://developers.docusign.com)
* [DocuSign API on Twitter](https://twitter.com/docusignapi)
* [DocuSign For Developers on LinkedIn](https://www.linkedin.com/showcase/docusign-for-developers/)
* [DocuSign For Developers on YouTube](https://www.youtube.com/channel/UCJSJ2kMs_qeQotmw4-lX2NQ)




#### License 

The DocuSign LoanCo Sample App is licensed under the MIT [License](LICENSE).



