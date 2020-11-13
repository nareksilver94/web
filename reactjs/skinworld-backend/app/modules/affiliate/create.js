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
const { getReferralCut, getLevelByRefCount } = require('./get');

async function setRefCode(userId, refCode, translate) {
  // check if code already in use
  const count = await User.find({
    $text: {
      $search: refCode
    },
    referralCode: {
      $regex: new RegExp(`^${refCode}$`, 'i')
    },
  }).countDocuments();

  if (count !== 0) {
    throw errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('affiliate.codeTaken'));
  }

  // update db
  await User.updateOne({ _id: userId }, { $set: { referralCode: refCode } });

  return;
}

async function addRefFee(userQuery, operationSum, operation, __session, translate) {
  try {
    const session = __session || (await mongoose.startSession());
    let resp;
    let eventsToEmit;
    let logs;
    const transactionAction = async () => {
      logs = [];
      eventsToEmit = [];
      const user = await User.findOne(userQuery);

      // user havn't applied ref code
      if (user.referredBy === void 0) {
        resp = false;
        return;
      }

      const referredByUser = await User.findById(user.referredBy);

      // referred user is disabled
      if (referredByUser.status === userStatuses.Disabled) {
        resp = false;
        return;
      }

      const referralCut = getReferralCut(referredByUser.referralLevel);
      const referralFee = operationSum * referralCut;

      // add fee
      const result = await referredByUser
        .update({
          $inc: {
            availableReferralFee: referralFee,
            totalReferralFee: referralFee
          }
        })
        .session(session);

      eventsToEmit.push(["socket.emit", {
        eventName: "user.balance",
        userId: referredByUser._id,
        message: translate('affiliate.newReferralFee', { fee: referralFee, name: user.username })
      }]);

      // save transaction
      await Transaction.create(
        [
          {
            value: referralFee,
            transactionType: transactionTypes.AffiliateReward,
            user: referredByUser._id
          }
        ],
        { session }
      );

      if (result.nModified === 0) {
        logs.push(['error', `Can't add referral fee to user balance after ${operation}, referral fee: $${referralFee}, operation initiator: ${user.email}`, { operation, referralFee, operator: user.id }]);
        resp = false;
      } else {
        logs.push([
          'info',
          `Successfuly added referral fee $${referralFee} to ${referredByUser.email} after ${operation} on $${operationSum} from ${user.email}`,
          {
            referralFee,
            referredUser: referredByUser.id,
            operation,
            operationSum,
            user: user.id
          }
        ]);
        resp = true;
      }
    };

    if (__session === void 0) {
      await session.withTransaction(transactionAction);
    }
    else {
      await transactionAction();
    }

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }

    for (const [action, ...args] of logs) {
      logger[action](...args);
    }

    return resp;
  } catch (err) {
    logger.log(err);
    if (__session !== void 0) {
      // if outer session exist throw error so outer transaction can revert changes
      throw err;
    }
  }
}

module.exports = {
  addRefFee,
  setRefCode,
};
