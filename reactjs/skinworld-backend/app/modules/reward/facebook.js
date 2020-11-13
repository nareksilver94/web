const { statusCodes, errorMaker } = require("../../helpers");
const User = require("../../models/user");
const mongoose = require("mongoose");
const base64url = require("base64url");
const crypto = require("crypto");
const request = require("request-promise-native");
const querystring = require("querystring");
const config = require("../../../config");
const { userStatuses } = require("../../constants");
const globalEvent = require("../event");

async function claimFacebook(userId, signedRequest) {
  const FACEBOOK_REWARD = 0.5;

  // // validate facebook signed request
  // const [signatureToVerify, rawPayload] = signedRequest.split('.');

  // if (rawPayload === void 0) {
  //   throw {
  //     status: statusCodes.BAD_REQUEST,
  //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
  //     description: 'There is not payload in signedRequest',
  //   };
  // }

  // const signature = base64url(crypto.createHmac('sha256', config.app.fbAppSecret).update(rawPayload).digest());

  // if (signatureToVerify !== signature) {
  //   throw {
  //     status: statusCodes.BAD_REQUEST,
  //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
  //     description: 'Signature is not correct',
  //   };
  // }

  // let payload;

  // try {
  //   payload = JSON.parse(base64url.decode(rawPayload));
  // } catch (error) {
  //   throw {
  //     status: statusCodes.BAD_REQUEST,
  //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
  //     description: 'Wrong JSON format in payload',
  //   };
  // }

  // const fbUserId = payload.user_id;

  // if (fbUserId === void 0) {
  //   throw {
  //     status: statusCodes.BAD_REQUEST,
  //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
  //     description: 'There is not user_id in payload',
  //   };
  // }

  const user = await User.findById(userId);

  // if (user.rewards.facebook.claimed === true) {
  //   throw {
  //     status: statusCodes.BAD_REQUEST,
  //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
  //     description: 'Reward already claimed',
  //   };
  // }

  // const fbIdCount = await User.find({ 'facebook.id': fbUserId }).countDocuments();

  // if (fbIdCount !== 0) {
  //   throw {
  //     status: statusCodes.BAD_REQUEST,
  //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
  //     description: 'Another user already claimed that Facebook account',
  //   };
  // }

  // update db
  await user.update({
    $inc: { balance: FACEBOOK_REWARD },
    $set: {
      "rewards.facebook.claimed": true
      // 'facebook.id': fbUserId,
    }
  });
  globalEvent.emit("socket.emit", {
    eventName: "user.balance",
    userId,
    balance: user.balance,
    message: `$${FACEBOOK_REWARD} added to your account.`
  });

  return;
}

module.exports = {
  claimFacebook,
};
