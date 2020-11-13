const { verifyToken } = require("../modules/auth");
const ipChecker = require("../modules/ip-checker");
const redis = require("../modules/redis");
const User = require("../models/user");
const { errorMaker, utils } = require("../helpers");
const { userTypes, userStatuses } = require("../constants");
const { translate } = require("../i18n");

module.exports = async (req, res, next) => {
  let accessToken = req.get("Authorization");

  try {
    if (!accessToken) {
      throw errorMaker("UNAUTHORIZED", "Token is missing");
    }
    if (req.authVerified) {
      return next();
    }

    accessToken = accessToken.split(" ").pop();

    const tokenParsed = await verifyToken(accessToken);
    const allUserTypes = Object.values(userTypes);

    if (allUserTypes.indexOf(tokenParsed.type) === -1) {
      // this is not auth token
      throw errorMaker(
        "BAD_REQUEST",
        (req.translate || translate)("user.invalidToken")
      );
    }

    req.authVerified = true;
    req.token = tokenParsed;

    // check ip
    let ip = utils.getIpFromRequest(req);
    await ipChecker.checkIp(ip, tokenParsed.id, req.translate || translate);

    next();
  } catch (err) {
    next(err);
  }
};
