const { omit } = require('lodash');
const crypto = require('crypto');
const authHandler = require('./auth-handler');
const logger = require('../modules/logger');
const ipChecker = require('../modules/ip-checker');
const { utils, errorMaker } = require("../helpers");
const config = require("../../config");
const { translate } = require('../i18n');
const MODULE_NAME = 'API_LOG';

const URL_WHITE_LIST = [
  '/v1/status',
  '/v1/time',
  '/v1/redis-reset',
  '/v1/users/online',
  '/v1/users/authenticate/fb/return',
  '/v1/users/authenticate/fb',
  '/v1/deposit/process-coinbase-webhook',
  '/v1/deposit/process-payop-webhook',
  '/v1/deposit/process-g2a-ipn',
  '/v1/deposit/process-cp-ipn',
  '/v1/withdrawals/aftership-wh'
];
const IP_WHITE_LIST = [
  '127.0.0.1'
];
const API_EXPIRE_TIME = +process.env.API_EXPIRE_TIME;

module.exports = async function apiTracker (req, res, next) {
  // just skip preflight calls
  if (req.method === 'OPTIONS') {
    return next();
  }

  const url = req.originalUrl.split('?')[0];
  const body = req.body;
  const query = req.query;

  let ip = utils.getIpFromRequest(req);
  let lang = req.get('lang');
  const testApiToken = req.get('x-test-token');

  req.translate = (key, data) => translate(key, data, lang);

  if (testApiToken && testApiToken === process.env.TEST_CALL_TOKEN) {
    return next();
  }
  if (URL_WHITE_LIST.indexOf(url) !== -1) {
    return next();
  }
  if (IP_WHITE_LIST.indexOf(ip) !== -1) {
    return next();
  }

  try {
    // validate api key (valid for 2 mins)
    if (config.app.apiToken && API_EXPIRE_TIME) {
      const apiToken = req.get('apitoken');
      const timestamp = +req.get('timestamp');

      if (!apiToken) {
        throw errorMaker('BAD_PERMISSION', 'Direct api calls are not allowed');
      }
      if (Date.now() - timestamp > API_EXPIRE_TIME) {
        throw errorMaker('BAD_PERMISSION', 'API token expired');
      }

      const calcToken = crypto.createHash('sha256')  
        .update(`${config.app.apiToken}_lootiekey_${timestamp}`)
        .digest('hex');

      if (calcToken !== apiToken) {
        throw errorMaker('BAD_PERMISSION', 'Direct api calls are not allowed');
      }
    }

    const token = req.get('Authorization') || undefined;
    const user = req.token || undefined;

    if (token && !user) {
      // haven't verified token
      return authHandler(req, res, (err) => {
        if (err) {
          return next(err);
        }

        apiTracker(req, res, next);
      });
    } else if (!token) {
      // bare api call, checking ip
      await ipChecker.checkIp(ip, void 0, req.translate);
    }

    if (user) {
      logger.log('', { MODULE_NAME, user, url, ip, body, query });
    }
    next();
  } catch (error) {
    next(error);
  }
}
