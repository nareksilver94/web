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

async function getUserWithdrawals({
  userId,
  search,
  limit, 
  offset,
  sortBy,
  sortDirection,
  ...withdrawalQuery
}) {
  // find all Withdraw transactions from that user
  const transactionQuery = {
    "transaction.transactionType": transactionTypes.Withdraw,
  };
  if (userId) {
    transactionQuery["transaction.user._id"] = mongoose.Types.ObjectId(userId);
  }
  if (search) {
    withdrawalQuery.orderId = new RegExp(search, "i");
    transactionQuery["transaction.user.email"] = new RegExp(search, "i");
  }

  const __query = [
      {
        $match: withdrawalQuery         
      },
      {
        $lookup: {
          from: "transactions",
          localField: "transaction",
          foreignField: "_id",
          as: "transaction",
        }
      },
      {
        $unwind: "$transaction"
      },
      {
        $lookup: {
          from: "users",
          localField: "transaction.user",
          foreignField: "_id",
          as: "transaction.user"
        }
      },
      { '$unwind': '$transaction.user' },
      { $match: transactionQuery },
      {
        $lookup: {
          from: "site-items",
          localField: "item.itemId",
          foreignField: "_id",
          as: "item.itemId"
        }
      },
      { '$unwind': '$item.itemId' },
      {
        $project: {
          _id: 1,
          withdrawalType: 1,
          status: 1,
          createdAt: 1,
          sentTimestamp: 1,
          shippingAddress: 1,
          tracking: 1,
          "transaction.status": 1,
          "transaction.value": 1,
          "transaction._id": 1,
          "transaction.user.email": 1,
          "transaction.user.profileImageUrl": 1,
          "transaction.user.username": 1,
          "transaction.user.depositedValue": 1,
          "transaction.user._id": 1,
          "item.itemId.assetId": 1,
          "item.itemId.color": 1,
          "item.itemId.image": 1,
          "item.itemId.name": 1,
          "item.itemId.type": 1,
          "item.itemId.value": 1,
          "item.itemId._id": 1,
          "item.details": 1,
        }
      }
  ];

  const countResult = await Withdrawal.aggregate([
    ...__query,
    { $group: {
      _id: null,
      total: { $sum: 1 }
    } }
  ]);
  const total = countResult.length ? countResult[0].total : 0;

  if (sortBy && sortDirection) {
    const sort = { [sortBy]: sortDirections[sortDirection] };
    __query.push({ $sort: sort })
  }
  
  if (limit > 0) {
    __query.push(
      { $skip: offset * limit },
      { $limit: limit }
    );
  }
  
  __query.push(
    { $group: {
      _id: null,
      total: { $sum: 1 },
      data: { $push: '$$ROOT' }
    } },
  );

  const result = await Withdrawal.aggregate(__query).allowDiskUse(true);

  return {
    total,
    data: result.length ? result[0].data : []
  };
}

async function getTrackingByToken(signedToken, translate) {
  let token;

  try {
    token = await auth.verifyToken(signedToken);
  } catch (err) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.wrongToken'));
  }

  if (token.type !== "shipping") {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.wrongTokenType'));
  }

  const withdrawal = await Withdrawal.findById(token.withdrawalId).lean();

  if (withdrawal === null) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.notExistWithdrawal'));
  }

  return {
    tracking: withdrawal.tracking
  };
}

async function getVariantAdditionalFees(itemId, variantId, translate) {
  const siteItem = await SiteItem.findById(itemId).lean();

  if (siteItem === null) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.notExistSiteItem'));
  }

  const variant = siteItem.availableVariants.find(variant => {
    if (variant._id.toString() === variantId) {
      return true;
    }

    return false;
  });

  if (variant === void 0) {
    // no such variant
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.notItemVariant'));
  }

  let adjustmentFeeValue = 0;

  if (siteItem.value < variant.value) {
    adjustmentFeeValue = variant.value - siteItem.value;
  }

  // create shipment fee tx if necessary
  let shipmentFeeValue = stats.mean(
    Object.values(siteItem.shippingInfo || {}).reduce((accum, value) => {
      const shippingPrice = value.estimatedShippingPrice;

      if (shippingPrice !== void 0 && shippingPrice !== 0) {
        accum.push(shippingPrice);
      }

      return accum;
    }, [])
  );

  if (Number.isNaN(shipmentFeeValue) === true) {
    shipmentFeeValue = 0;
  }

  return {
    adjustment: adjustmentFeeValue,
    shipment: shipmentFeeValue
  };
}

module.exports = {
  getUserWithdrawals,
  getTrackingByToken,
  getVariantAdditionalFees
}
