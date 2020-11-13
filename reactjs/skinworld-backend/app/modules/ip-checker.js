const redis = require("../modules/redis");
const User = require("../models/user");
const { errorMaker, utils, statusCodes } = require("../helpers");
const { userTypes, userStatuses } = require("../constants");
const { translate } = require("../i18n");
const logger = require('./logger');
const MODULE_NAME = 'IP_CHECKER';

const WHITELIST = ['127.0.0.1'];
const BLACKLIST = [];

const checkIp = async (ip, userId, translate) => {
  if (!ip) {
    logger.warning('No IP detected', { MODULE_NAME, userId });
    return;
  }
  if (WHITELIST.includes(ip)) {
	  return;
	}
	if (BLACKLIST.includes(ip)) {
	  throw errorMaker(statusCodes.BAD_PERMISSION, translate("user.banned"));
	}

  const ipKey = redis.getKey('IP_PREFIX', ip);
  const userKey = redis.getKey('USER_PREFIX', userId);

  try {
    let ipStatus = await redis.hgetAsync(ipKey, 'status');
    let registeredUserIp = await redis.hgetAsync(userKey, 'ip');

    // add new ip to user record & mapping cache, skip when no user id provided
    const isNewIp = userId && (!registeredUserIp || !registeredUserIp.includes(ip));
    let status = userStatuses.Offline;

    if (isNewIp) {
      const user = await User.findById(userId).select('ip status');

      if (!user) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate("user.userNotFound"));
      } else if (user.ip) {
        if (!user.ip.includes(ip)) {
          user.ip = `${user.ip}, ${ip}`;
        }
      } else {
        user.ip = ip;
      }

      status = user.status;
      await user.save();

      redis.hmset(userKey, { ip: user.ip });
    }

    // don't rewrite if ip is banned already - rarely called
    if (!ipStatus && status === userStatuses.Disabled) {
      redis.hmset(ipKey, { status });
    }
    // ban user if ipStatus exists, this is always DISABLED for now.
    if (ipStatus === userStatuses.Disabled) {
      throw errorMaker(statusCodes.BAD_PERMISSION, translate("user.banned"));
    }
  } catch (err) {
    throw err;
  }
}


module.exports = {
  checkIp,
};
