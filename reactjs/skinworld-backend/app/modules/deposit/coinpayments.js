const mongoose = require("mongoose");
const config = require("../../../config");
const User = require("../../models/user");
const Transaction = require("../../models/transaction");
const affiliate = require("../affiliate");
const {
  referralOpTypes,
  transactionTypes,
  depositTypes
} = require("../../constants");
const globalEvent = require("../event");
const logger = require("../logger");
const { translate } = require('../../i18n');

const MODULE_NAME = 'COINPAYMENT'

async function processIpn(params) {
  if (params.merchant !== config.app.coinpaymentsMerchantId) {
    logger.error(`Wrong merchant id`, { MODULE_NAME, id: params.merchant });
    // wrong merchant id(?...)
    return;
  }

  if (params.ipn_type !== "simple") {
    logger.error(`IPN type is not valid`, { MODULE_NAME, type: params.ipn_type });
    // we only accept IPNs from "Simple button"
    return;
  }

  if (params.status !== "100") {
    logger.error(`IPN status is not valid`, { MODULE_NAME, status: params.status });
    // 100 status = successful payment, we don't need anything else here
    return;
  }

  const txnId = params.txn_id;

  if (params.currency1 !== "USD") {
    logger.error(
      `Currency1 for CoinPayments depositing isn't USD(probably purposefuly malformed), check it manually to up balance, txn id: ${txnId}`,
      { MODULE_NAME, txnId }
    );
    return;
  }

  const userId = params.custom;

  if (userId === void 0) {
    logger.error(`User id isn't specific for CoinPayment deposit`, { MODULE_NAME, txnId });
    return;
  }

  const depositAmount = parseFloat(params.amount1);

  if (Number.isNaN(depositAmount)) {
    logger.error(
      `Can't parse deposit amount as a float for CoinPayment deposit`,
      { MODULE_NAME, txnId }
    );
    return;
  }

  // trying to find that txn
  const deposit = await Transaction.findOne({ extId: txnId }).lean();

  if (deposit !== null) {
    // duplicate/late IPN, that txn already confirmed
    return;
  }

  // update db in transaction

  try {
    const session = await mongoose.startSession();

    // save transaction
    await Transaction.createCollection();

    let eventsToEmit;
    let logs;
    await session.withTransaction(async () => {
      eventsToEmit = [];
      logs = [];

      const tx = await Transaction.create(
        [
          {
            value: depositAmount,
            transactionType: transactionTypes.Deposit,
            subType: depositTypes.CoinPayment,
            user: userId,
            extId: txnId
          }
        ],
        { session }
      );

      // add deposit amount to user balance
      const user = await User.findById(userId).session(session);

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
              id: tx._id,
              revenue: depositAmount
            },
            products: [{
              name: 'Deposit',
              id: '12345',
              price: depositAmount,
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

      if (updateResult.nModified === 0) {
        throw new Error("No user entry was changed");
      }

      logs.push([
        'info',
        `Successfuly deposited $${depositAmount} via CoinPayments, txn id: ${txnId}, user id: ${userId}`,
        { MODULE_NAME, depositAmount, txnId, userId }
      ]);

      // add referral fee
      await affiliate.addRefFee(
        { _id: userId },
        depositAmount,
        referralOpTypes.COINPAYMENTS_DEPOSIT,
        session
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
      `Can't process CoinPayments deposit because of error, txn id: ${txnId}`,
      { MODULE_NAME, error, txnId }
    );
  }
}

module.exports = {
  processIpn
};
