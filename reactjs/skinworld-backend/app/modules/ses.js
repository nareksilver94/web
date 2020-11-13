const AWS = require("aws-sdk");
const config = require("../../config");
const { getSESParams } = require("../helpers");
const logger = require("./logger");
const MODULE_NAME = "SES";

/**
 * Send email
 *
 * @param {Object} payload
 * @param {String} payload.subject    email subject
 * @param {Object} payload.data       email data
 * @param {String} payload.type  	  template type
 */
const sendEmail = payload => {
  const ses = getValidSES();

  const sender = config.app.systemEmail;
  const recipients =
    typeof payload.destinations === "string"
      ? payload.destinations.split(",")
      : payload.destinations;

  const params = getSESParams({
    sender,
    recipients,
    ...payload
  });

  return new Promise((resolve, reject) => {
    ses.sendEmail(params, function(err, data) {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

function getValidSES() {
  const aws_config = new AWS.Config({
    accessKeyId: config.app.awsAccessKey,
    secretAccessKey: config.app.awsSecretAccessKey,
    region: "us-east-1" // SES does not support other regions
  });

  return new AWS.SES(aws_config);
}

module.exports = {
  sendEmail
};
