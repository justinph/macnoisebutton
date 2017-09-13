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

const fs = require('fs');
const https = require('https');
const qs = require('qs');

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

const loginAndGetApiToken = () => {
  const postData = fs.readFileSync('./secrets.json').toString(); //getUserInfo();
  const reqOpts = AUTH_POST; // TODO: clone this in future, fine for now
  reqOpts.headers['Content-Length'] = Buffer.byteLength(postData);

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
    console.log('auth resp', body);
    return JSON.parse(body);
  });
};

const postNewComplaint = (authData) => {

  //console.log('got authData', authData);

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
  // reqOpts.headers.origin = 'https://www.macenvironment.org';
  // reqOpts.headers.referer = 'https://www.macenvironment.org/customers/';

  console.log(postData, reqOpts);

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
    console.log(body);
  });
};


const submitComplaint = (event, callback) => {

  loginAndGetApiToken()
    .then((responseData) => {
      postNewComplaint(responseData);
    })
    .then(() => {
      console.log('done');
    })


};

submitComplaint();
