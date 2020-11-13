const mongoose = require('mongoose');
const { pick } = require('lodash');
const { statusCodes, errorMaker } = require('../../helpers');
const User = require('../../models/user');
const Case = require('../../models/case');
const Transaction = require('../../models/transaction');
const config = require('../../../config');
const { getLevelByRefCount } = require('./get');
const { userStatuses, transactionTypes, emailTemplateTypes, caseTypes } = require('../../constants');
const { sendEmail } = require('../email.js');
const globalEvent = require('../event');
const logger = require('../logger');

// apply referral code
async function applyRefCode(userId, refCode, translate) {
  const user = await User.findById(userId);
  const [freeboxSlug] = await Case.distinct('slug', { caseTypes: caseTypes.FREE });

  // ref code already applied
  if (user.referredBy !== void 0) {
    if (user.hasFreeboxOpened) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('affiliate.codeApplied'));
    } else {
      return { freeboxSlug };
    }
  }

  const referredByUser = await User.findOne({
    $text: {
      $search: refCode
    },
    referralCode: {
      $regex: new RegExp(`^${refCode}$`, "i")
    }
  });

  // no such ref code
  if (referredByUser === null) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('affiliate.codeNotExist'));
  }

  // ref code owner is disabled
  if (referredByUser.status === userStatuses.Disabled) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('affiliate.refUserAccountDisabled'));
  }

  if (referredByUser.id === user.id) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('affiliate.cantOwnRefCode'));
  }

  let refReward = 0;

  try {
    const session = await mongoose.startSession();
    let eventsToEmit;
    await session.withTransaction(async () => {
      eventsToEmit = [];
      const currentReferredUserCount = referredByUser.referredUserCount + 1;
      const currentRefLevel = getLevelByRefCount(currentReferredUserCount);

      // set referral level, increment referredUserCount
      await referredByUser
        .update({
          $inc: { referredUserCount: 1 },
          $set: { referralLevel: currentRefLevel }
        })
        .session(session);

      // referral reward for code applying
      // TODO: refactor this to send reward code based on level or admin 's decision
      // TODO: BE CAUTIOS: send email after withTransaction call, because
      //       function inside withTransaction could be executed multiple times
      // await RewardCode.createCollection();
      // const rewardCode = await RewardCode
      //   .findOne({ type: rewardCodeTypes.FreeBox })
      //   .session(session);

      // if (rewardCode) {
      //   const code = shortid.generate().toUpperCase();
      //   rewardCode.codes = rewardCode.codes || [];
      //   rewardCode.codes.push(code);
      //   rewardCode.markModified('codes');
      //   await rewardCode.save();

      //   const emailParams = {
      //     destinations: user.email,
      //     subject: "Lootie FreeBox Code",
      //     type: emailTemplateTypes.Text,
      //     name: "freebox",
      //     body: `Your freebox code is ${code}. Apply code here: ${_redirectUrl}`
      //   };

      //   sendEmail(emailParams);
      // }

      // set referredBy and add ref reward to referral earnings
      await user
        .updateOne({
          $set: { referredBy: referredByUser.id }
        })
        .session(session);

      // using user.balance event to notify
      eventsToEmit.push(["socket.emit", {
        eventName: "user.balance",
        userId: user.id,
        message: translate('affiliate.referredBy', { name: referredByUser.username })
      }]);

      eventsToEmit.push(["socket.emit", {
        eventName: "user.referred",
        userId: referredByUser.id,
        referralLevel: currentRefLevel,
        referredUserCount: currentReferredUserCount,
        message: translate('affiliate.refer', { name: user.username })
      }]);

      // save transaction
      // await Transaction.createCollection();
      // await Transaction.create(
      //   [
      //     {
      //       value: refReward,
      //       transactionType: transactionTypes.Reward,
      //       user: userId
      //     }
      //   ],
      //   { session }
      // );
    });

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }
  } catch (error) {
    logger.error(
      `User ${user.id} can't apply ref code(${refCode}), ref code owner: ${referredByUser.id}`,
      { error, user: user.id, refCode, referred: referredByUser.id }
    );

    throw errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('global.serverError'));
  }

  return { freeboxSlug };
}

async function sendInvite(userId, emailAddress) {
  const user = await User.findById(userId).lean();

  const link = `https://${config.app.frontHost}/r/${user.referralCode}`;

  const emailParams = {
    destinations: emailAddress,
    subject: "Invitation to Lootie",
    type: emailTemplateTypes.Html,
    name: "invite",
    data: {
      link,
      profileImg: user.profileImageUrl,
      senderName: user.username
    },
    source: 'invite',
  };

  try {
    sendEmail(emailParams);
  } catch (error) {
    console.error(error);

    throw errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('global.serverError'));
  }

  return;
}

module.exports = {
  applyRefCode,
  sendInvite
};
