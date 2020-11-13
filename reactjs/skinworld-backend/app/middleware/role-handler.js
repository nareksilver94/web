const { errorMaker } = require("../helpers");

module.exports = roles => (req, res, next) => {
  if (!req.token) {
    return next(errorMaker("UNAUTHORIZED", "Token is missing"));
  }

  const { type } = req.token;

  if (roles instanceof Array === false) {
    roles = [roles];
  }

  if (roles.indexOf(type) === -1) {
    next(errorMaker("BAD_PERMISSION", "You don't have permission"));
  } else {
    next();
  }
};
