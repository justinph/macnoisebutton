
const fs = require('fs');
const path = require('path');
const https = require('https');
const twilio = require('twilio');
const Datastore = require('@google-cloud/datastore');
const secrets = require('./secrets.json');
const projectId = 'macnoise-179703';
const region = 'us-central1';

console.log('projectId', projectId);

const datastore = new Datastore({
  projectId,
  keyFilename: path.resolve(__dirname, 'google-creds.json')
});




const DATASTORE_KIND = 'phonenumber';

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


const loginAndGetApiToken = (email, password) => {
  const reqOpts = AUTH_POST;
  const userObj = JSON.stringify({
    email,
    password
  });

  reqOpts.headers['Content-Length'] = Buffer.byteLength(userObj); //getUserInfo(true)

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


const postNewComplaint2 = (macAuthData, complaintObj) => {

  const postData = JSON.stringify(complaintObj);

  const reqOpts = COMPLAINT_POST; // TODO: clone this in future
  reqOpts.headers['Content-Length'] = Buffer.byteLength(postData);
  reqOpts.headers['api-token'] = macAuthData['api-token'];
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

  return loginAndGetApiToken({
      email: secrets.MAC.email,
      password: secrets.MAC.password
    })
    .then((responseData) => {
      return postNewComplaint(responseData);
    })
    .then((macResp) => {
      // Prepare a response to the SMS message
      const response = new MessagingResponse();

      if (macResp.message) {
        response.message(macResp.message);
      } else {
        response.message(JSON.parse(macResp).message);
      }

      // Send the response
      return res
        .status(200)
        .type('text/xml')
        .end(response);
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

function getComplaintObject () {
  return Object.assign({}, {
    early_late: false,
    excessive_noise: false,
    frequency: false,
    ground_noise: false,
    helicopter: false,
    low: false,
    run_up: false,
    structural_disturbance: false,
    other: false,
    id_locations: null, // need be set
    complaint_iso8601: new Date().toJSON(),
    airport: 'MSP',
    ad_flag: 'D',
    opnum: null,
    runway: null
  });
}

function getComplaintObjFromMessage (message) {
  message = message.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,'');
  const complaintObj = getComplaintObject();
  switch (message){
    case 'complain':
    case '✈️':
    case 'too loud':
      complaintObj.excessive_noise = true;
      return complaintObj;
    case '😴':
    case '🌚':
    case '🌛':
    case '🌜':
      complaintObj.early_late = true;
      return complaintObj;
    case '🤢':
      complaintObj.frequency = true;
      return complaintObj;
    case '👇':
      complaintObj.low = true;
      return complaintObj;
    default:
      return false;
  }
}


exports.messenger = (req, res) => {
  let number = getPhoneNumber(req);
  let message = getMessage(req);

  if (number && message) {
    const key = datastore.key([DATASTORE_KIND, number]);

    let complaintObj = getComplaintObjFromMessage(message);

    let dataStoreData, macAuthData;

    return datastore.get(key)
      .then((dsData) => {
        if (!dsData[0].username || !dsData[0].password) {
          throw new Error('something went wrong with the datastore!');
        }
        dataStoreData = dsData[0];
        return loginAndGetApiToken(dsData[0].username, dsData[0].password);
      })
      .then((authData) => {
          macAuthData = authData;
          return postNewComplaint2(authData, complaintObj);
      })
      .then((macComplaintResp) => {
        console.log(macComplaintResp);
        let macResp = JSON.parse(macComplaintResp);
        return res
          .status(200)
          .json({
            number,
            message,
            complaintObj,
            dataStoreData,
            macAuthData,
            macResp: macResp.message,
          })
          .end();
      })

      .catch((e) => {
        console.error(e);
      });
  }

  console.error('number:', number, 'message', message);
  return res
    .status(500)
    .json({
        error: !number ? 'missingNumber' : (!message ? 'missingMessage' : 'otherError')
      })
    .end();
};




