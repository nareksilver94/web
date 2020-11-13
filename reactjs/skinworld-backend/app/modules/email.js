const config = require("../../config");
const request = require("request-promise-native");
const { getEmailBody } = require("../helpers");
const logger = require("./logger");
const errorMaker = require("../helpers/error-maker.js");
const User = require("../models/user.js")
const MODULE_NAME = "EMAIL";

/**
 * Send email
 *
 * @param {Object} payload
 * @param {String} payload.subject email subject
 * @param {String|Object|Array} payload.destinations email destinations(to)
 *  String for just email
 *  Object { email, name } for email and name
 *  Array<Object|String> for multiple recipients(array item could be any of above)
 * @param {String} payload.name template name
 * @param {Object} payload.data template params
 * @param {String} payload.type mime type
 * @param {String} payload.body email text if type is Text
 * @param {String} payload.source where this module comes from(action like "invite" etc)
 */
async function sendEmail(payload) {
  const sender = {
    email: config.app.systemEmail,
    name: config.app.systemEmailName,
  };

  // format recipients
  let recipients;

  if (typeof payload.destinations === 'string') {
    // only email
    recipients = [{
      email: payload.destinations,
    }];
  }
  else if (payload.destinations instanceof Array === true) {
    recipients = payload.destinations.map((dest) => {
      if (typeof dest === 'string') {
        return {
          email: dest,
        };
      }
      else if (dest instanceof Object === true) {
        return {
          email: dest.email,
          name: dest.name,
        };
      }
      else {
        throw errorMaker(null, 'Wrong email destinations array item, should be object or string');
      }
    });
  }
  else if (payload.destinations instanceof Object === true) {
    recipients = [{
      email: payload.destinations.email,
      name: payload.destinations.name,
    }];
  }

  const emailBody = getEmailBody({
    sender,
    recipients,
    ...payload,
  });

  const resp = await request({
    uri: 'https://api.sendgrid.com/v3/mail/send',
    method: 'POST',
    body: emailBody,
    auth: {
      bearer: config.app.sendgridApiKey,
    },
    json: true,
  });

  return true;
};

async function processWebhook(payload) {
  for (const event of payload) {
    if (event.event === 'bounce') {
      // email bounced
      const source = event.source_action;

      if (
        [
          'forgot-password',
          'reset-password',
          'shipment-made',
        ].includes(source) === false
      ) {
        continue;
      }

      // mark email as invalid only when user object is exists(above array)
      const email = event.email;

      const resp = await User.updateOne({
        email,
      }, {
        $set: {
          isEmailInvalid: true,
        },
      });

      if (resp.nModified !== 0) {
        logger.info(`Email ${email} marked as invalid after it bounced; reason: ${event.reason}; email source: ${source}; smtp-id: ${event['smtp-id']}`, { MODULE_NAME });
      }
    }
  }
}

module.exports = {
  sendEmail,
  processWebhook,
};
