const { verifyToken } = require("../modules/auth");

module.exports = (req, res, next) => {
  let accessToken = req.get("Authorization");

  if (accessToken === void 0) {
    return next();
  }

  accessToken = accessToken.split(" ").pop();

  verifyToken(accessToken)
    .then(token => {
      req.token = token;
      next();
    })
    .catch(() => {
      next();
    });
};
