// grab the mongoose module
const mongoose = require("mongoose");
const { rewardCodeTypes } = require('../constants');
const logger = require("../modules/logger.js");

const rewardCodeSchema = mongoose.Schema(
  {
    name: {
      type: String
    },
    value: {
      type: mongoose.SchemaTypes.Mixed
    },
    type: {
      type: String,
      enum: Object.values(rewardCodeTypes),
      default: rewardCodeTypes.FreeBox
    },
    codes: [{
      type: String,
    }]
  },
  {
    timestamps: true,
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

rewardCodeSchema.index({ codes: 1 }, { unique: true });

const RewardCode = mongoose.model("rewardcodes", rewardCodeSchema);

RewardCode.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for RewardCode model, err: ${err}`);
  }
});

module.exports = RewardCode;
