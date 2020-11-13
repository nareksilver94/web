const mongoose = require("mongoose");
const config = require("../../../config");
const User = require("../../models/user");
const Transaction = require("../../models/transaction");
const Promocode = require("../../models/promocode");
const affiliate = require("../affiliate");
const {
  referralOpTypes,
  transactionTypes,
  depositTypes,
  transactionStatuses
} = require("../../constants");
const globalEvent = require("../event");
const coinbase = require("coinbase-commerce-node");
const { statusCodes, errorMaker } = require("../../helpers");
const logger = require("../logger");
const { translate } = require('../../i18n');

const MODULE_NAME = "COINBASE";

const { Client: CoinbaseClient, Webhook: CoinbaseWebhook } = coinbase;
const CoinbaseCharge = coinbase.resources.Charge;

CoinbaseClient.init(config.app.coinbaseApiKey);

async function initDeposit(userId, depositAmount, coupon, translate) {
  try {
    const resp = await CoinbaseCharge.create({
      name: "Deposit",
      description: "Deposit to website balance",
      local_price: {
        amount: depositAmount,
        currency: "USD"
      },
      pricing_type: "fixed_price"
    });

    // create pending deposit tx
    await new Transaction({
      value: depositAmount,
      transactionType: transactionTypes.Deposit,
      subType: depositTypes.Coinbase,
      status: transactionStatuses.Pending,
      user: userId,
      coupon,
      extId: resp.code
    }).save();

    return {
      checkoutUrl: resp.hosted_url
    };
  } catch (err) {
    throw errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('global.serverError'));
  }
}

async function processWebhook(payload) {
  const CHARGE_CONFIRMED = "charge:confirmed";
  const CHARGE_FAILED = "charge:failed";
  const event = payload.event;
  const event_type = event.type;

  // webhook example: https://commerce.coinbase.com/docs/api/#webhooks
  if (event_type !== CHARGE_CONFIRMED && event_type !== CHARGE_FAILED) {
    // we need only confirmed/failed events
    return;
  }

  // trying to find that txn
  const depositTx = await Transaction.findOne({ extId: event.data.code });

  if (depositTx === null) {
    // no such deposit was initiated earlier
    return;
  }

  if (depositTx.status !== transactionStatuses.Pending) {
    // tx already resolved, duplicate webhook
    return;
  }

  const userId = depositTx.user.toString();

  if (event_type === CHARGE_FAILED) {
    // deposit failed
    depositTx.status = transactionStatuses.Failed;

    await depositTx.save();

    logger.error(
      `Coinbase deposit for user ${userId} just failed, charge code: ${event.data.code}`,
      { code: event.data.code, user: userId, MODULE_NAME }
    );
  } else if (event_type === CHARGE_CONFIRMED) {
    let depositAmount = depositTx.value;

    const session = await mongoose.startSession();

    try {
      // deposit finished successfuly
      // update db in transaction
      let eventsToEmit;
      let logs;
      await session.withTransaction(async () => {
        logs = [];
        eventsToEmit = [];
        depositTx.status = transactionStatuses.Completed;

        await depositTx.save({ session });

        // add deposit amount to user balance
        const user = await User.findById(userId)
          .session(session)
          .populate('promocodes');

        // check promo code
        if (depositTx.coupon) {
          const promocode = await Promocode
            .findOne({ code: new RegExp(`^${depositTx.coupon}$`, 'i') })
            .session(session)
            .lean();

          if (promocode) {
            const isUsed =
              user.promocodes &&
              user.promocodes.some(v => v.code.toLowerCase() === depositTx.coupon.toLowerCase());

            // Just skip promocode if it is invalid
            if (!isUsed) {
              depositAmount *= (1 + promocode.value / 100);
              user.promocodes.push(promocode._id);
            }
          }
        }

        user.balance += depositAmount;
        user.depositedValue += depositTx.value;

        await user.save();

        eventsToEmit.push(["socket.emit", {
          eventName: "user.balance",
          userId,
          balance: user.balance,
          deposited: user.depositedValue,
          type: 'DEPOSIT',
          message: `You 've deposited $${depositAmount}`
        }]);

        // tracking
        eventsToEmit.push(["socket.emit", {
          eventName: "ga",
          isSingle: true,
          userId,
          ecommerce: {
            purchase: {
              actionField: {
                id: depositTx._id,
                revenue: depositTx.value
              },
              products: [{
                name: 'Deposit',
                id: '12345',
                price: depositTx.value,
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

        logs.push([
          'info',
          `Successfuly deposited $${depositAmount} via Coinbase, charge code: ${event.data.code}, user id: ${userId}`,
          { depositAmount, code: event.data.code, user: userId, MODULE_NAME }
        ]);

        // add referral fee
        await affiliate.addRefFee(
          { _id: userId },
          depositAmount,
          referralOpTypes.COINBASE_DEPOSIT,
          session,
          translate
        );
      });

      for (const [eventName, args] of eventsToEmit) {
        globalEvent.emit(eventName, args);
      }

      for (const [action, ...args] of logs) {
        logger[action](...args);
      }
    } catch (error) {
      logger.error(
        `Can't process Coinbase deposit because of error, charge code: ${event.data.code}`,
        { error, code: event.data.code, MODULE_NAME }
      );

      // throw error so coinbase will send same webhook later
      throw new Error("Internal Error");
    } finally {
      session.endSession();
    }
  }
}

function verifySignature(payload, signature) {
  try {
    CoinbaseWebhook.verifySigHeader(
      payload,
      signature,
      config.app.coinbaseWebhookSecret
    );

    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  processWebhook,
  verifySignature,
  initDeposit
};
