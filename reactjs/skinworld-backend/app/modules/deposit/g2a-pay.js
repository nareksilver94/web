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
const request = require("request-promise-native");
const crypto = require("crypto");
const { statusCodes, errorMaker } = require("../../helpers");
const globalEvent = require("../event");
const logger = require("../logger");
const { translate } = require('../../i18n');

const MODULE_NAME = "G2A";

async function startDeposit(userId, depositValue, userIp, coupon, paymentOption, translate) {
  // left just 2 digits after dec. point
  depositValue = Number(depositValue.toFixed(2));

  // create tx in db
  const tx = await new Transaction({
    value: depositValue,
    transactionType: transactionTypes.Deposit,
    subType: depositTypes.G2A,
    user: userId,
    coupon
  });

  const requestHmac = crypto.createHmac("sha256", config.app.g2aApiSecret);
  logger.log("hash before submit", { txId: tx.id, depositValue, MODULE_NAME });
  requestHmac.update(`${tx.id}${depositValue}USD${config.app.g2aApiSecret}`);
  const requestHash = requestHmac.digest("hex");

  // DEBUG
  logger.log("request hash", { requestHash, MODULE_NAME });

  let token;

  // create g2a quote
  try {
    const options = {
      uri: "https://checkout.pay.g2a.com/index/createQuote",
      method: "POST",
      json: true,
      form: {
        api_hash: config.app.g2aApiHash,
        hash: requestHash,
        order_id: tx.id,
        amount: depositValue,
        currency: "USD",
        url_failure: `https://${config.app.frontHost}/deposit`,
        url_ok: `https://${config.app.frontHost}/deposit`,
        items: JSON.stringify([
          {
            sku: "deposit",
            name: `Deposit $${depositValue}`,
            amount: depositValue,
            qty: 1,
            id: "deposit",
            price: depositValue,
            url: `https://${config.app.host}/deposit?value=g2a`
          }
        ]),
        customer_ip_address: userIp
      }
    };
    if (paymentOption) {
      options.form.process_payment = paymentOption;
    }
    const response = await request(options);

    if (response.status !== "ok") {
      // DEBUG
      logger.error("Error", response);

      throw new Error("Status is not okay");
    }

    token = response.token;
    tx.extId = token;

    await tx.save();
  } catch (error) {
    // DEBUG
    logger.error("Internal Server Error", { error });

    // remove tx from db
    await tx.remove();

    throw errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('global.serverError'));
  }

  return {
    checkoutUrl: `https://checkout.pay.g2a.com/index/gateway?token=${token}`
  };
}

async function processIpn(payload) {

  const session = await mongoose.startSession();
  let userId, eventsToEmit, logs;

  try {
    await session.withTransaction(async () => {
      logs = [];
      eventsToEmit = [];

      const tx = await Transaction.findById(payload.userOrderId).session(
        session
      );

      if (tx === null) {
        // no such tx exist
        return;
      }

      logs.push(['log', "Processing transaction", { txId: tx.id, MODULE_NAME, status: payload.status }]);

      if (tx.status !== transactionStatuses.Pending) {
        // transaction already finished
        return;
      }

      if (payload.status === "pending") {
        // shouldn't be a case, just to be sure
        return;
      }

      tx.extId = payload.transactionId;
      userId = tx.user.toString();

      let depositValue = tx.value;

      if (payload.status === "complete") {
        const user = await User.findById(tx.user)
          .populate('promocodes')
          .session(session);

        if (!user) {
          throw errorMaker(statusCodes.BAD_REQUEST, translate('user.userNotFound'));
        }

        if (tx.coupon) {
          const promocode = await Promocode
            .findOne({ code: new RegExp(`^${tx.coupon}$`, 'i') })
            .session(session)
            .lean();

          if (promocode) {
            const isUsed =
              user.promocodes &&
              user.promocodes.some(v => v.code.toLowerCase() === tx.coupon.toLowerCase());

            if (!isUsed) {
              depositValue *= (1 + promocode.value / 100);
              user.promocodes.push(promocode._id);
            }
          }
        }

        tx.status = transactionStatuses.Completed;
        tx.extId = payload.transactionId;
        await tx.save();

        logs.push(['info', "G2A deposit success", {
          transaction: tx.id,
          depositedValue: depositValue,
          user: user.id,
          MODULE_NAME
        }]);

        // increment user balance
        user.balance += depositValue;
        user.depositedValue += tx.value;
        await user.save();

        eventsToEmit.push(["socket.emit", {
          eventName: "user.balance",
          userId,
          balance: user.balance,
          deposited: user.depositedValue,
          type: 'DEPOSIT',
          message: `G2A deposit success. $${depositValue} added to your account`
        }]);

        // tracking
        eventsToEmit.push(["socket.emit", {
          eventName: "ga",
          isSingle: true,
          userId,
          ecommerce: {
            purchase: {
              actionField: {
                id: tx._id,
                revenue: tx.value
              },
              products: [{
                name: 'Deposit',
                id: '12345',
                price: tx.value,
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

        // add referral fee
        await affiliate.addRefFee(
          { _id: tx.user.toString() },
          depositValue,
          referralOpTypes.G2A_DEPOSIT,
          session,
          translate
        );
      } else {
        // mark as failed
        tx.status = transactionStatuses.Failed;
        tx.extId = payload.transactionId;
        await tx.save();

        throw new Error('Deposit failed');
      }
    });

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }

    for (const [action, ...args] of logs) {
      logger[action](...args);
    }
  } catch (error) {
    // DEBUG
    logger.error("Internal Server Error", { error, MODULE_NAME });

    if (userId) {
      globalEvent.emit("socket.emit", {
        eventName: "user.balance",
        userId,
        type: 'G2A_DEPOSIT_FAIL',
      });
    }

    return;
  } finally {
    session.endSession();
  }
}

module.exports = {
  startDeposit,
  processIpn
};
