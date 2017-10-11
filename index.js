/**
 * Cloud Function.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */
// exports.helloWorld = function helloWorld (event, callback) {
//   console.log(`My Cloud Function: ${event.data.message}`);
//   callback();
// };
//
'use strict';

const fs = require('fs');
const https = require('https');
const twilio = require('twilio');

const secrets = require('./secrets.json');

const projectId = process.env.GCLOUD_PROJECT;
const region = 'us-central1';


const AUTH_POST =  {
  host: 'www.macenvironment.org',
  port: '443',
  path: '/api/v1/authenticate/customers',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-requested-with': 'XMLHttpRequest'
  }
};

const COMPLAINT_POST =  {
  host: 'www.macenvironment.org',
  port: '443',
  path: '/api/v1/customers/complaints',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-requested-with': 'XMLHttpRequest'
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

  //console.log(postData, reqOpts);

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

const MessagingResponse = twilio.twiml.MessagingResponse;


exports.reply = (req, res) => {
  let isValid = true;

  isValid = twilio.validateExpressRequest(
    req,
    secrets.TWILIO_AUTH_TOKEN,
    {url: `https://${region}-${projectId}.cloudfunctions.net/reply`}
  );

  // Halt early if the request was not sent from Twilio
  if (!isValid) {
    res
      .type('text/plain')
      .status(403)
      .send('Twilio Request Validation Failed.')
      .end();
    return;
  }

  return loginAndGetApiToken()
    .then((responseData) => {
      return postNewComplaint(responseData);
    })
    .then((macResp) => {
      // Prepare a response to the SMS message
      const response = new MessagingResponse();

      if (macResp.message) {
        response.message(macResp.message);
      } else {
        response.message(JSON.stringify(macResp));
      }

      // Send the response
      return res
        .status(200)
        .type('text/xml')
        .end(response.toString());
    });

};


function getPhoneNumber (req) {
  if (req.query.number) {
    return req.query.number;
  } else if (req.query.n) {
    return req.query.n;
  }
}

function getMessage (req) {
  if (req.query.msg) {
    return req.query.msg;
  } else if (req.query.message) {
    return req.query.message;
  }
}

exports.messenger = (req, res) => {
  let number = getPhoneNumber(req);
  let message = getMessage(req);

  if (number && message) {
    return res
      .status(200)
      .json({
        number,
        message,
      })
      .end();
  }
  console.error('number:', number, 'message', message);
  return res
    .status(500)
    .json({
        error: !number ? 'missingNumber' : (!message ? 'missingMessage' : 'otherError')
      })
    .end();
};




