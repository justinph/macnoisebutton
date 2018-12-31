const https = require('https');
const Twilio = require('twilio');

const secrets = {
  MAC: {
    email: 'justin@fiddlyio.com',
    password: '2Pm79F6M28996p6',
  }
};


const AUTH_POST =  {
  host: 'api.macnoms.com',
  port: '443',
  path: '/_api/v1/authenticate/customers',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const COMPLAINT_POST =  {
  host: 'api.macnoms.com',
  port: '443',
  path: '/_api/v1/customers/complaints',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const getUserInfo = (asString=false) => {
  if (asString) {
    return JSON.stringify(secrets.MAC);
  }
  return secrets.MAC;
};


const loginAndGetApiToken = () => {
  const reqOpts = AUTH_POST;
  reqOpts.headers['Content-Length'] = Buffer.byteLength(getUserInfo(true));

  return new Promise((resolve, reject) => {
    const req = https.request(reqOpts, (res) => {
      res.setEncoding('utf8');
      const body = [];
      res.on('data', (chunk) => body.push(chunk));
      res.on('end', () => resolve(body.join('')));
    });
    req.on('error', (err) => reject(err));
    req.write(getUserInfo(true));
    req.end();
  })
  .then((body) => {
    console.log('auth resp', body);
    return JSON.parse(body);
  });
};

const postNewComplaint = (authData) => {

  const postData = JSON.stringify({
    early_late: false,
    excessive_noise: true,
    frequency: true,
    ground_noise: false,
    helicopter: false,
    low: true,
    run_up: false,
    structural_disturbance: false,
    other: false,
    id_locations: authData.locations[0].guid,
    complaint_iso8601: new Date().toJSON(),
    airport: 'MSP',
    ad_flag: 'D',
    opnum: null,
    runway: null
  });

  const reqOpts = COMPLAINT_POST; // TODO: clone this in future
  reqOpts.headers['Content-Length'] = Buffer.byteLength(postData);
  reqOpts.headers['api-token'] = authData['api-token'];
  // a little sneak
  reqOpts.headers.origin = 'https://www.macenvironment.org';
  reqOpts.headers.referer = 'https://www.macenvironment.org/customers/';


  return new Promise((resolve, reject) => {
    const req = https.request(reqOpts, (res) => {
      res.setEncoding('utf8');
      const body = [];
      res.on('data', (chunk) => body.push(chunk));
      res.on('end', () => resolve(body.join('')));
    });
    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  })
  .then((body) => {
    return body;
  });
};

exports.handler = function(context, event, callback) {


  if (event.From.indexOf('6123869022') === -1 ){
    console.log('unatthorized attempt from', event.From);
    process.exit();
  }

  loginAndGetApiToken()
  .then((responseData) => {
    return postNewComplaint(responseData);
  })
  .then((macResp) => {
    console.log('resp', macResp);
    return JSON.parse(macResp).message;
  })
  .then(responseTxt => {
    let twiml = new Twilio.twiml.MessagingResponse()
    twiml.message(responseTxt);
    return twiml;
  })
  .then(twiml => {
    callback(null, twiml);
  })
  .catch(err => callback(err));
};
