const statusCodes = require("./statusCode");
const crypto = require("crypto");
const mongoose = require("mongoose");
const request = require("request-promise-native");

function sendResponse(res, data, meta = {}) {
  let { status, message } = meta;
  let _status, _resKey, _data, _message;

  if (data instanceof Error) {
    _status = data.status || 500;
    _message = data.message;
    _resKey = 'error';
  } else {
    if (data instanceof Object === true) {
      if ('message' in data === true) {
        _message = data.message;
        delete data.message;
      }
      // unwind if only data field left
      if ('data' in data === true && Object.keys(data).length === 1) {
        _data = data.data;
      } else {
        _data = data;
      }
    }

    _status = status || 200;
    _resKey = 'data';
  }

  return res.status(_status)
    .json({
      message: _message || statusCodes.getStatusText(_status),
      [_resKey]: _data
    });
}

function generateRandomHexString(len) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex")
    .slice(0, len)
    .toUpperCase();
}

function asyncWait(time) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
}

function getIpFromRequest(req) {
  const ipStr = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  let ip = ipStr.split(":").pop()

  if (ip.indexOf(',') !== -1) {
    ip = ip.split(',')[0].trim()
  }
  return ip;
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id) && mongoose.Types.ObjectId(id).toString() === id;
}

async function checkFileUrl(url) {
  try {
    await request({
      method: 'HEAD',
      url
    });
    return true
  } catch (err) {
    return false;
  }
}

const REGEXS = {
  email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  password: /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/,
  caseImage: new RegExp(`^https://${process.env.S3_BUCKET}.s3.amazonaws.com/images/case-images`),
  message: /<\/?[a-z][\s\S]*>/i
};

module.exports = {
  sendResponse,
  generateRandomHexString,
  asyncWait,
  getIpFromRequest,
  isValidId,
  checkFileUrl,
  REGEXS
};
