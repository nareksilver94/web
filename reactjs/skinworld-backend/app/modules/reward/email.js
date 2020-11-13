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

async function claimEmail(userId, translate) {
  const EMAIL_REWARD = 0.5;
  const user = await User.findById(userId);

  if (user.rewards.email.claimed === true) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('reward.rewardClaimed'));
  }

  if (user.status === userStatuses.Pending) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('user.emailNotVerified'));
  }

  await user.update({
    $inc: { balance: EMAIL_REWARD },
    $set: {
      "rewards.email.claimed": true,
      emailSubscription: true
    }
  });
  globalEvent.emit("socket.emit", {
    eventName: "user.balance",
    userId,
    balance: user.balance,
    message: `$${EMAIL_REWARD} added to your account.`
  });

  return;
}

module.exports = {
  claimEmail,
};
