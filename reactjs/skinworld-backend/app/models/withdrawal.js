// grab the mongoose module
const mongoose = require("mongoose");
const {
  transactionStatuses,
  withdrawalTypes,
  deliveryStatuses,
  orderStatuses,
  withdrawalStatuses
} = require("../constants");
const shippingAddress = require("./schema-types/shipping-address");
const Transaction = require("./transaction");
const logger = require("../modules/logger.js");

const withdrawalSchema = mongoose.Schema(
  {
    transaction: {
      type: mongoose.Types.ObjectId,
      ref: "transactions",
    },
    status: {
      type: String,
      enum: Object.values(withdrawalStatuses),
      default: withdrawalStatuses.Pending
    },
    sentTimestamp: {
      type: Date,
      default: Date.now()
    },
    item: {
      details: Object,
      itemId: {
        type: mongoose.Types.ObjectId,
        ref: "site-items"
      }
    },
    shippingAddress: Object,
    withdrawalType: {
      type: String,
      enum: Object.values(withdrawalTypes)
    },
    // deprecated field
    tracking: {
      trackingNumber: String,
      aftershipTrackingId: String,
      // id of last processed aftership event(from webhook)
      lastAftershipEventId: String,
      deliveryStatus: String,
      checkpoints: [
        {
          location: String,
          message: String,
          deliveryStatus: String,
          checkpointTime: Date
        }
      ],
      estimatedDelivery: Date,
      shipmentWeight: Number,
      shipmentWeightUnit: String,
      shipmentDeliveryDate: Date,
      shipmentPickupDate: Date,
      originCountry: String,
      destinationCountry: String
    },
    adjustmentFeeTx: {
      type: mongoose.Types.ObjectId,
      ref: "transactions"
    },
    shipmentFeeTx: {
      type: mongoose.Types.ObjectId,
      ref: "transactions"
    },
    order: {
      status: {
        type: String,
        enum: Object.values(orderStatuses),
        default: orderStatuses.Pending
      },
      orderId: String,  // direct order id
      stockxOrderId: String,
      stockxTrackingId: String,
      myUsTrackingId: String,
      lastUpdated: {
        type: Date,
        default: Date.now()
      }
    }
  },
  {
    timestamps: true,
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

withdrawalSchema.index({ status: 1 });
withdrawalSchema.index({ createdAt: 1 });
withdrawalSchema.index({ updatedAt: 1 });

withdrawalSchema.pre("remove", async function(next) {
  await Transaction.remove({ _id: this.transaction });
  next();
});

const Withdrawal = mongoose.model("withdrawals", withdrawalSchema);

Withdrawal.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for Withdrawal model, err: ${err}`);
  }
});

module.exports = Withdrawal;
