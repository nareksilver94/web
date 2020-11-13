const mongoose = require("mongoose");
const crypto = require("crypto");
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
const { statusCodes, errorMaker } = require("../../helpers");
const logger = require("../logger");
const { translate } = require('../../i18n');
const request = require('request-promise-native');

const MODULE_NAME = "PAYOP";

async function initDeposit(userId, depositAmount, coupon, translate) {
  try {
    const user = await User.findOne({
      _id: userId,
    })
      .select('username email')
      .lean();

    const orderId = `Payop-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    depositAmount = depositAmount.toFixed(4);

    const signature = crypto.createHash('sha256')
      .update(`${depositAmount}:USD:${orderId}:${config.app.payopSecretKey}`)
      .digest('hex');

    const resp = await request({
      uri: 'https://payop.com/v1/invoices/create',
      method: 'POST',
      json: true,
      body: {
        publicKey: config.app.payopPubKey,
        order: {
          id: orderId,
          amount: depositAmount,
          currency: 'USD',
          description: 'Deposit to website balance',
          items: [
            {
              id: "1",
              name: "Deposit Item 1",
              price: depositAmount
            }
          ],
        },
        payer: {
          email: user.email,
          name: user.username
        },
        language: 'en',
        // TODO:
        resultUrl: `https://${config.app.frontHost}/deposit`,
        failPath: `https://${config.app.frontHost}/deposit`,
        paymentMethod: 381,  // redirect directly to card deposit
        signature,
      }
    });

    if (resp.status !== 1) {
      throw new Error('Not successful response from payop API');
    }

    const tx = await new Transaction({
      value: depositAmount,
      transactionType: transactionTypes.Deposit,
      subType: depositTypes.Payop,
      status: transactionStatuses.Pending,
      user: userId,
      coupon,
      extId: resp.data
    }).save();

    return {
      checkoutUrl: `https://payop.com/en/payment/invoice-preprocessing/${resp.data}`,
    };
  } catch (err) {
    throw errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('global.serverError'));
  }
}

async function processWebhook(payload) {
  // there is no way to verify authenticity of this IPN
  // so we just get transaction id from it and then
  // check if it's active and fetch tx data from payop API
  const transactionId = payload.transaction.id;
  const invoiceId = payload.invoice.id;

  if (typeof transactionId !== 'string' || typeof invoiceId !== 'string') {
    throw errorMaker(statusCodes.BAD_REQUEST, 'Wrong input');
  }

  let userId = null;

  try {
    const { data: payopTx } = await request({
      uri: `https://payop.com/v1/transactions/${transactionId}`,
      auth: {
        bearer: config.app.payopJwt,
      },
      json: true,
    });

    if (payopTx.state !== 3 && payopTx.state !== 5 && payopTx.state !== 2) {
      // transaction is pending
      return;
    }

    const session = await mongoose.startSession();
    let eventsToEmit;
    let logs;

    await session.withTransaction(async () => {
      logs = [];
      eventsToEmit = [];

      const depositTx = await Transaction.findOne({
        extId: invoiceId,
        status: transactionStatuses.Pending,
      })
        .session(session);

      if (depositTx === null) {
        // no such pending transaction
        return;
      }

      userId = depositTx.user.toString();

      if (payopTx.state === 3 || payopTx.state === 5) {
        // failed transaction
        depositTx.status = transactionStatuses.Failed;
        await depositTx.save();

        throw payopTx.error;
      } else if (payopTx.state === 2) {
        // accepted transaction
        let depositAmount = depositTx.value;
        depositTx.status = transactionStatuses.Completed;

        await depositTx.save();

        // add deposit amount to user balance
        const user = await User.findById(userId)
          .session(session);

        if (depositTx.coupon) {
          // promocode
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
        user.depositedValue += depositAmount;

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
          `Successfuly deposited $${depositAmount} via Payop, invoice id: ${depositTx.extId}, user id: ${userId}`,
          { depositAmount, code: depositTx.extId, user: userId, MODULE_NAME }
        ]);

        // add referral fee
        await affiliate.addRefFee(
          { _id: userId },
          depositAmount,
          referralOpTypes.PAYOP_DEPOSIT,
          session,
          translate
        );
      }
    });

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }

    for (const [action, ...args] of logs) {
      logger[action](...args);
    }
  } catch (error) {
    logger.error(
      `Can't process Payop deposit because of error, invoice id: ${invoiceId}`,
      { error, code: transactionId, userId, MODULE_NAME }
    );

    if (userId) {
      globalEvent.emit("socket.emit", {
        eventName: "user.balance",
        userId,
        type: 'PAYOP_DEPOSIT_FAIL',
      });
    }

    // throw error so payop will send same webhook later
    throw new Error("Internal Error");
  }
}

module.exports = {
  processWebhook,
  initDeposit
};
