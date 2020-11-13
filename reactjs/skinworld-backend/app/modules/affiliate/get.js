const mongoose = require('mongoose');
const { pick } = require('lodash');
const { statusCodes, errorMaker } = require('../../helpers');
const User = require('../../models/user');
const Case = require('../../models/case');
const Transaction = require('../../models/transaction');
const config = require('../../../config');
const { userStatuses, transactionTypes, emailTemplateTypes, caseTypes } = require('../../constants');
const globalEvent = require('../event');
const logger = require('../logger');

async function getUserInfo(userId, translate) {
  const user = await User.findById(userId);

  return {
    personal: {
      totalReferrals: user.referredUserCount,
      commisionCut: getReferralCut(user.referralLevel),
      allEarnings: user.totalReferralFee,
      referralReceives: config.app.refRewardBase,
      availableEarnings: user.availableReferralFee
    }
  };
}

async function claimFee(userId, translate) {
  const user = await User.findById(userId);
  const availableFee = user.availableReferralFee;

  try {
    await user.update({
      $inc: { balance: availableFee },
      $set: { availableReferralFee: 0 }
    });
    globalEvent.emit("socket.emit", {
      eventName: "user.balance",
      userId,
      balance: user.balance,
      message: translate('affiliate.redeemEarning', { value: availableFee })
    });
  } catch (error) {
    logger.error(
      `User ${user.email} can't claim $${availableFee} referral earnings`,
      { error, user: userId, availableFee }
    );

    throw errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('global.serverError'));
  }

  return {
    claimed: availableFee
  };
}

// set new referral code
// userQuery - mongo query to fetch user
// return referral cut for specific level
function getReferralCut(userLevel) {
  const cutLevel = Math.min(userLevel, config.app.referralCutLevels.length);

  return config.app.referralCutLevels[cutLevel - 1];
}

// return referral reward(reward for applying somebody else ref code)
// userLevel is level of user whose ref code is applying
function getReferralReward(userLevel) {
  const referralCut = getReferralCut(userLevel);

  return config.app.refRewardBase * referralCut;
}

// rCount - referred users count
function getLevelByRefCount(rCount) {
  for (let i = config.app.referralLevels.length - 1; i >= 0; --i) {
    const levelLimit = config.app.referralLevels[i];

    if (rCount >= levelLimit) {
      return i + 2;
    }
  }

  return 1;
}

module.exports = {
  getUserInfo,
  claimFee,
  getReferralCut,
  getReferralReward,
  getLevelByRefCount,
};
