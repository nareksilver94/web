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

async function updateShippingAddress(userId, payload, translate) {
  const updateResult = await User.updateOne(
    { _id: userId },
    { shippingAddress: payload }
  );

  if (updateResult.nModified === 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.notModifyProfile'));
  }

  return;
}

async function processAftershipWebhook(payload) {
  if (payload.event !== "tracking_update") {
    // we only need tracking updates
    return;
  }

  const tracking = payload.msg;
  const withdrawal = await Withdrawal.findOne({
    "tracking.aftershipTrackingId": tracking.id
  });

  if (withdrawal === null) {
    // we don't have such withdrawal tracking
    return;
  }

  if (
    tracking.checkpoints instanceof Array &&
    tracking.checkpoints.length !== withdrawal.tracking.checkpoints.length
  ) {
    // update checkpoints
    const processedCheckpoints = tracking.checkpoints.map(checkpoint => {
      return {
        location: checkpoint.location,
        message: checkpoint.message,
        deliveryStatus: checkpoint.tag,
        checkpointTime: moment.utc(checkpoint.checkpoint_time)
      };
    });

    withdrawal.tracking.checkpoints = processedCheckpoints;
  }

  const estimatedDelivery =
    tracking.order_promised_delivery_date || tracking.expected_delivery;

  if (estimatedDelivery !== null) {
    withdrawal.tracking.estimatedDelivery = moment.utc(estimatedDelivery);
  }

  if (tracking.shipment_pickup_date !== null) {
    withdrawal.tracking.shipmentPickupDate = moment.utc(
      tracking.shipment_pickup_date
    );
  }

  if (tracking.shipment_delivery_date !== null) {
    withdrawal.tracking.shipmentDeliveryDate = moment.utc(
      tracking.shipment_delivery_date
    );
  }

  withdrawal.tracking.originCountry = tracking.origin_country_iso3;
  withdrawal.tracking.destinationCountry = tracking.destination_country_iso3;
  withdrawal.tracking.shipmentWeight = tracking.shipment_weight || void 0;
  withdrawal.tracking.shipmentWeightUnit =
    tracking.shipment_weight_unit || void 0;
  withdrawal.tracking.deliveryStatus = tracking.tag;

  if (withdrawal.tracking.lastAftershipEventId === void 0) {
    // send email to user on first webhook update
    const tx = await Transaction.findById(withdrawal.transaction).lean();
    const user = await User.findById(tx.user);

    const watchToken = await auth.issueToken(
      {
        withdrawalId: withdrawal.id,
        type: "shipping"
      },
      "150d"
    );

    if (user.email && user.status !== userStatuses.Pending) {
      const emailText = `Your ordered item are sent, you can check shipment status here: https://www.lootie.com/account/deposits?token=${watchToken}`;

      sendEmail({
        destinations: user.email,
        subject: "Shipment made",
        type: emailTemplateTypes.Text,
        body: emailText,
        source: 'shipment-made',
      });
    }
  }

  withdrawal.tracking.lastAftershipEventId = payload.event_id;

  withdrawal.markModified("tracking");

  // save
  await withdrawal.save();

  return;
}

async function addTracking(withdrawalId, trackingNumber, translate) {
  const withdrawal = await Withdrawal.findById(withdrawalId);

  if (withdrawal === null) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.notExistWithdrawal'));
  }

  if (withdrawal.tracking.trackingNumber !== void 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.withdrawalTrack'));
  }

  // create tracking
  let tracking;

  try {
    const createTrackingResp = await request({
      uri: "https://api.aftership.com/v4/trackings",
      method: "POST",
      headers: {
        "aftership-api-key": config.app.aftershipApiKey
      },
      body: {
        tracking: {
          tracking_number: trackingNumber
        }
      },
      json: true
    });

    if (createTrackingResp.meta.code !== 201) {
      throw new Error("Tracking wasn't created");
    }

    tracking = createTrackingResp.data.tracking;
  } catch (error) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.notCreateTrack'));
  }

  // save minimal data to db(webhook should arrive in few seconds with full data)
  withdrawal.tracking.aftershipTrackingId = tracking.id;
  withdrawal.tracking.trackingNumber = trackingNumber;
  withdrawal.tracking.deliveryStatus = tracking.tag;

  await withdrawal.save();

  return;
}

const updateWithdrawal = async (payload, translate) => {
  try {
    if (payload.order) {
      payload.order.lastUpdated = Date.now();
    }
    const result = await Withdrawal.findByIdAndUpdate(payload.id, payload);
    return result;
  } catch (err) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('withdrawal.notExistWithdrawal'));
  }
};

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

async function removeWithdrawals(withdrawalIds) {
  try {
    const withdrawals = await Withdrawal.find({ _id: { $in: withdrawalIds } })
      .select('transaction')
      .lean();

    const transactionIds = withdrawals.map(withdrawal => withdrawal.transaction);

    await Withdrawal.remove({ _id: { $in: withdrawalIds } });
    await Transaction.remove({ _id: { $in: transactionIds } });

    return withdrawalIds;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  updateShippingAddress,
  processAftershipWebhook,
  addTracking,
  updateWithdrawal,
  removeWithdrawals,
};
