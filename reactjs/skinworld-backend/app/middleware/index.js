const validate = require("./validator");
const errorHandler = require("./error-handler");
const corsHandler = require("./cors-handler");
const authHandler = require("./auth-handler");
const roleHandler = require("./role-handler");
const unless = require("./unless");
const apiTracker = require("./api-tracker");
const populateAuthToken = require("./populate-auth-token");
const rateLimiter = require("./rate-limiter");

module.exports = {
  isAuthenticated: authHandler,
  has: roleHandler,
  validate,
  errorHandler,
  corsHandler,
  unless,
  populateAuthToken,
  rateLimiter,
  apiTracker
};
