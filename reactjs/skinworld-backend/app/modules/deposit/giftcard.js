const mongoose = require('mongoose')
const Giftcard = require('../../models/giftcard')
const User = require('../../models/user')
const Transaction = require('../../models/transaction')
const AffilateModule = require('../affiliate')
const globalEvent = require('../event')
const { errorMaker, statusCodes } = require('../../helpers')
const { transactionTypes, transactionStatuses, depositTypes, referralOpTypes } = require('../../constants')
const logger = require('../logger')

const MODULE_NAME = 'GIFTCODE'

const deposit = async (userId, code, translate) => {
  const session = await mongoose.startSession();

  try {
    let resp, eventsToEmit, logs;

    await session.withTransaction(async () => {
      eventsToEmit = [];
      logs = [];

      const giftcard = await Giftcard.findOne({ codes: code }).session(session)
      if (!giftcard) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('deposit.giftCardRedeemed'));
      }

      const user = await User.findById(userId).session(session)
      if (!user) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('user.userNotExist'));
      }

      const tx = new Transaction({
        value: giftcard.value,
        transactionType: transactionTypes.Deposit,
        subType: depositTypes.Giftcard,
        user: userId,
        extId: code,
        status: transactionStatuses.Completed
      })

      giftcard.codes = giftcard.codes.filter(v => v !== code)
      user.balance += giftcard.value
      user.depositedValue += giftcard.value

      await giftcard.save({ session })
      await user.save({ session })
      await tx.save({ session })

      // add referral fee
      await AffilateModule.addRefFee(
        { _id: userId },
        giftcard.value,
        referralOpTypes.GIFTCODE_DEPOSIT,
        session,
        translate,
      );

      logs.push(['info', 'Gift item deposited', { MODULE_NAME, code, user: userId, cardId: giftcard._id }]);

      // eventsToEmit.push(["socket.emit", {
      //   eventName: "user.balance",
      //   userId,
      //   balance: user.balance,
      //   deposited: user.depositedValue,
      //   message: `Giftcard deposit success. $${giftcard.value} added to your account`
      // }]);

      // tracking
      eventsToEmit.push(["socket.emit", {
        eventName: "ga",
        isSingle: true,
        userId,
        ecommerce: {
          purchase: {
            actionField: {
              id: tx._id,
              revenue: giftcard.value
            },
            products: [{
              name: 'Deposit',
              id: '12345',
              price: giftcard.value,
              category: MODULE_NAME,
              quantity: 1
            }]
          }
        }
      }]);
      eventsToEmit.push(["socket.emit", {
        eventName: "ga",
        isSingle: true,
        userId,
        event: 'transaction'
      }]);

      resp = {
        message: translate('deposit.depositSuccess', {
          value: giftcard.value,
          type: 'Giftcard'
        }),
        data: {
          balance: user.balance,
          deposited: user.depositedValue
        }
      };
    });

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }

    for (const [action, ...args] of logs) {
      logger[action](...args);
    }

    return resp;
  } catch (error) {
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = {
  deposit
}
