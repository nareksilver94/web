const mongoose = require("mongoose");
// const logger = require("../modules/logger.js");

const caseStatisticsSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Types.ObjectId,
      ref: "cases",
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users"
    },
    views: {
      all: {
        type: Number,
        default: 0
      },
      canAfford: {
        type: Number,
        default: 0
      }
    },
    opens: {
      all: {
        type: Number,
        default: 0
      }
    },
    unregisteredViews: {
      type: Number,
      default: 0
    },
    testing: Boolean,
  },
  {
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

caseStatisticsSchema.index({ case: 1 }, { unique: true });

const CaseStatistics = mongoose.model("cases-statistics", caseStatisticsSchema);

CaseStatistics.on('index', (err) => {
  if (err !== void 0) {
    console.log();
    // logger.error(`Error while creating index for CaseStatistics model, err: ${err}`);
  }
});

module.exports = CaseStatistics;
