const mongoose = require("mongoose");
const logger = require("../modules/logger.js");

const userStatisticsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },
    firstOpenedCase: {
      type: mongoose.Types.ObjectId,
      ref: "cases"
    },
    firstViewedCase: {
      type: mongoose.Types.ObjectId,
      ref: "cases"
    },
    testing: Boolean,
  },
  {
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

userStatisticsSchema.index({ user: 1 });

const UserStatistics = mongoose.model("users-statistics", userStatisticsSchema);

UserStatistics.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for UserStatistics model, err: ${err}`);
  }
});

module.exports = UserStatistics;
