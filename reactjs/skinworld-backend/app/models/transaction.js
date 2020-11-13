// grab the mongoose module
const mongoose = require("mongoose");
// const autoIncrement = require('mongoose-auto-increment');
const {
  transactionTypes,
  depositTypes,
  transactionStatuses
} = require("../constants");
const logger = require("../modules/logger.js");

// autoIncrement.initialize(mongoose.connection);

// in-site transaction model
const transactionSchema = mongoose.Schema(
  {
    transactionId: {
      type: Number,
    },
    value: Number,
    transactionType: {
      type: String,
      enum: Object.values(transactionTypes),
      default: transactionTypes.Deposit
    },
    subType: {
      type: String,
      enum: Object.values(depositTypes),
      default: depositTypes.Other
    },
    status: {
      type: String,
      enum: Object.values(transactionStatuses),
      default: transactionStatuses.Pending
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users"
    },
    extId: {
      type: String,
    },
    coupon: String
  },
  {
    timestamps: true,
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

transactionSchema.index({
  extId: 1,
});

transactionSchema.index({
  status: 1,
});

transactionSchema.index({
  user: 1,
  transactionType: 1,
});

transactionSchema.index({
  createdAt: 1,
});

transactionSchema.index({
  updatedAt: 1,
});


// transactionSchema.plugin(autoIncrement.plugin, { model: 'transactions', field: 'transactionId' });

const Transaction = mongoose.model("transactions", transactionSchema);

Transaction.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for Transaction model, err: ${err}`);
  }
});

module.exports = Transaction;
