const mongoose = require("mongoose");
const moment = require("moment");
const stats = require("stats-lite");
const request = require("request-promise-native");
const { pick } = require("lodash");

const { statusCodes, errorMaker } = require("../../helpers");
const User = require("../../models/user");
const UserItem = require("../../models/user-item");
const SiteItem = require("../../models/site-item");
const Transaction = require("../../models/transaction");
const Withdrawal = require("../../models/withdrawal");
const {
  withdrawalTypes,
  transactionTypes,
  itemTypes,
  transactionStatuses,
  emailTemplateTypes,
  userStatuses,
  sortDirections
} = require("../../constants");
const config = require("../../../config");
const { sendEmail } = require("../email");
const auth = require("../auth");
const globalEvent = require("../event");
const { translate } = require('../../i18n');

async function createWithdrawal(userId, payload, translate) {
  const user = await User.findById(userId);

  // validate input
  if (
    payload.withdrawalOption === withdrawalTypes.RealWorld &&
    payload.shipping === void 0 &&
    user.shippingAddress === void 0
  ) {
    // no shipping address provided and no shipping address
    // saved in account
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.specifyShippingAddress'));
  }

  if (payload.shipping !== void 0) {
    delete payload.shipping.shippingType;
  }

  // collect item ids into array(and pre-validate)
  const userItemIds = payload.items.map(item => {
    if (mongoose.Types.ObjectId.isValid(item.id) === false) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.wrongItemIds'));
    }

    return item.id;
  });

  // validate specified items
  const userItems = await UserItem.find({
    user: userId,
    _id: { $in: userItemIds }
  }).lean();

  // not all items exist/owned by user
  if (userItems.length !== userItemIds.length) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.notOwnAllSpecifiedItems'));
  }

  const siteItemIds = Array.from(
    new Set(userItems.map(item => item.item.toString()))
  );

  const siteItems = await SiteItem.find({
    _id: { $in: siteItemIds }
  }).lean();

  const siteItemsById = siteItems.reduce((accum, item) => {
    accum[item._id.toString()] = item;
    return accum;
  }, {});

  const payloadItemsById = payload.items.reduce((accum, item) => {
    accum[item.id] = item;
    return accum;
  }, {});

  const processedItems = [];
  let totalAvgPrice = 0;

  // process items, validate details
  for (const item of userItems) {
    const details = payloadItemsById[item._id.toString()].details || {};
    const siteItem = siteItemsById[item.item.toString()];
    const processedDetails = {};

    if (siteItem.value < config.app.minWithdrawalPrice) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.priceLow', { value: config.app.minWithdrawalPrice }));
    }

    const withdrawableOptions = [
      itemTypes.Amazon,
      itemTypes.Stockx,
      itemTypes.Red_Bubble
    ]

    // item type and withdrawal option don't fit
    if (
      payload.withdrawalOption === withdrawalTypes.RealWorld &&
      withdrawableOptions.indexOf(siteItem.type) === -1
    ) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.wrongWithdrawalItemType', {
        value: withdrawableOptions.join(', ')
      }));
    }

    if (
      siteItem.availableVariants &&
      siteItem.availableVariants.length > 1 &&
      !details.variantId
    ) {
      // need to select variant if site item has available variants
      throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.noVariantId'));
    }

    if (
      details.variantId &&
      siteItem.availableVariants !== void 0 &&
      siteItem.availableVariants.length !== 0
    ) {
      // find available variant with that id
      if (
        typeof details.variantId !== "string" &&
        mongoose.Types.ObjectId.isValid(details.variantId) === false
      ) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.invalidVariantId'));
      } else {
        processedDetails.variant = siteItem.availableVariants.find(variant => {
          if (variant._id.toString() === details.variantId) {
            return true;
          }

          return false;
        });
      }

      // if (variant === void 0) {
      //   // no such variant
      //   throw {
      //     status: statusCodes.BAD_REQUEST,
      //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
      //     description: 'No item variant found with provided id',
      //   };
      // }
      // else {

      // }
    }

    processedItems.push({
      itemId: siteItem._id.toString(),
      details: processedDetails
    });

    totalAvgPrice += siteItem.value;
  }

  const session = await mongoose.startSession();

  try {
    let eventsToEmit;

    await session.withTransaction(async () => {
      eventsToEmit = [];

      // create withdraw transaction
      await Transaction.createCollection();
      const withdrawTx = await new Transaction({
        transactionType: transactionTypes.Withdraw,
        user: userId,
        value: totalAvgPrice
      }).save({ session });

      let balanceChange = 0;
      if (payload.withdrawalOption === withdrawalTypes.RealWorld) {
        // remove items from user inventory
        const deleteResult = await UserItem.deleteMany({
          _id: { $in: userItemIds }
        }).session(session);

        if (deleteResult.deletedCount !== userItemIds.length) {
          throw errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('global.serverError'));
        }

        const shippingAddress = payload.shipping || user.shippingAddress;

        // create withdrawal collection
        await Withdrawal.createCollection();

        // create withdrawal for each item
        for (const item of processedItems) {
          const siteItem = siteItemsById[item.itemId];
          let adjustmentFeeTx;
          let shipmentFeeTx;
          let adjustmentValue = 0;

          if (
            item.details.variant &&
            siteItem.value < item.details.variant.value
          ) {
            // if avg price is higher than variant price then
            // create adjustment fee tx
            adjustmentValue = item.details.variant.value - siteItem.value;

            adjustmentFeeTx = await new Transaction({
              transactionType: transactionTypes.Adjustment,
              user: userId,
              value: adjustmentValue
            }).save({ session });

            // subtract adjustment value from user balance
            user.balance -= adjustmentValue;

            if (user.balance < 0) {
              throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.insufficientBalance'));
            }
            balanceChange -= adjustmentValue;

            await user.save({ session });
          }

          // create shipment fee tx if necessary
          let shipmentFee = stats.mean(
            Object.values(siteItem.shippingInfo || {}).reduce(
              (accum, value) => {
                const shippingPrice = value.estimatedShippingPrice;

                if (shippingPrice !== void 0 && shippingPrice !== 0) {
                  accum.push(shippingPrice);
                }

                return accum;
              },
              []
            )
          );

          if (Number.isNaN(shipmentFee) === false && shipmentFee !== 0) {
            shipmentFeeTx = await new Transaction({
              transactionType: transactionTypes.ShipmentFee,
              user: userId,
              value: shipmentFee
            }).save({ session });

            // subtract shipment fee from user balance
            user.balance -= shipmentFee;

            if (user.balance < 0) {
              throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.insufficientBalance'));
            }
            balanceChange -= shipmentFee;

            await user.save({ session });
          }

          // create withdrawal
          const withdrawal = await new Withdrawal({
            transaction: withdrawTx,
            item,
            withdrawalType: withdrawalTypes.RealWorld,
            shippingAddress,
            shipmentFeeTx,
            adjustmentFeeTx
          }).save({ session });

          if (balanceChange !== 0) {
            eventsToEmit.push(["socket.emit", {
              eventName: "user.balance",
              userId,
              balance: user.balance,
              message: `We 've used $${-balanceChange.toFixed(
                2
              )} additionally for shipping & adjustment fees`
            }]);
          }
        }
      }
    });

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }
  } catch (error) {
    console.error(error);

    throw error;
  } finally {
    session.endSession();
  }

  return;
}

module.exports = {
  createWithdrawal,
};
