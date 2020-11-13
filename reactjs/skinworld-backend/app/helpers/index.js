const errorMaker = require("./error-maker");
const statusCodes = require("./statusCode");
const utils = require("./utils");
const getEmailBody = require("./email-template");

module.exports = {
  errorMaker,
  statusCodes,
  getEmailBody,
  utils
};
