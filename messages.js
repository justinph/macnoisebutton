
'use strict';

const messages = {

    greeting:   "Hi, I'm the MSP airplane noise complaint robot. I can help make filing a complaint easier, via txt. Sound good? Say yes or 👍 to continue",
    getStarted:
        [ "To get started, you need to make an account at the MSP Noise website.\n It is important you don't use this password anywhere else since you'll share it with me.",
         "Ok, here's the URL where you can sign up: https://www.macenvironment.org/customers/#new-account\n When you've created an account, reply with your username."
        ],
    getPassword: "Ok, now reply with the password. Remember, don't use this password anywhere else since it will not be encrypted or protected! I don't want that responsibility.",
    gotPassword:  "Fantastic! Your login info checks out. If you ever want to opt-out of this system, reply with \"NUKE ME\" any time to delete everything I know about you.",
    loginError:  "Drats! There seems to be a problem with your login. I've made my human aware of it, but maybe you can try again? Send me your username again.",
    readyComplaint: "We're ready to make a complaint! Just text ✈️ or \"COMPLAIN\" and we'll do it. You can also send 😴 for too early/late, 🤢 for too frequent, and 👇for too low.",

    complaintError: "Hmm. I didn't recognize that. Try ✈️ or \"COMPLAIN\" and we'll do it. You can also send 😴 for too early/late, 🤢 for too frequent, and 👇for too low. ",

    help:       "HELP: ✈️ or \"COMPLAIN\" for too loud, 😴 for too early/late, 🤢 for too frequent, and 👇for too low. Or \"NUKE ME\" and we'll forget all about you.",

    tooFrequent: "Woah there! You can't complain more than once every 5 minutes. Sorry (not sorry)."

};

module.exports = messages;
