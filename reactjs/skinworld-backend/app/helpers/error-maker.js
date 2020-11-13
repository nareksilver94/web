const statusCodes = require("./statusCode");

module.exports = function(type, message) {
  let errorName = "";
  let errorMsg = message;
  let errorStatus = 500;

  switch (type) {
    case statusCodes.UNAUTHORIZED:
      errorName = "UnauthorizedError";
      errorStatus = 401;
      errorMsg = errorMsg || "Authentication required";

      break;

    case statusCodes.BAD_REQUEST:
      errorName = "BadRequest";
      errorStatus = 400;
      errorMsg = errorMsg || "Invalid request";

      break;

    case statusCodes.BAD_PERMISSION:
      errorName = "BadPermission";
      errorStatus = 403;
      errorMsg = errorMsg || "Permission Denied";

      break;

    case statusCodes.UNREDEEMABLE:
      errorName = "BadPermission";
      errorStatus = 400; // TODO: correct code
      errorMsg = errorMsg || "UNREDEEMABLE"; // TODO: correct message

      break;

    default:
      errorName = "InternalServerError";
      errorStatus = 500;
      errorMsg = errorMsg || "An error occurred";

      break;
  }

  const error = new Error(errorMsg);

  error.name = errorName;
  error.status = errorStatus;
  error.message = errorMsg;

  return error;
};
