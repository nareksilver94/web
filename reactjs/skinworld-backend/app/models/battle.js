// grab the mongoose module
const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const { battleStatuses } = require("../constants");
const logger = require("../modules/logger.js");

const battleSchema = mongoose.Schema(
  {
    cases: [{
      case: {
        type: mongoose.Types.ObjectId,
        ref: "cases",
      },
      count: {
        type: Number,
        default: 1
      }
    }],
    sessions: [{
      user: {
        type: mongoose.Types.ObjectId,
        ref: "users",
      },
      seed: String,
      winning: {
        type: Number,
        default: 0
      },
      rounds: [{
        opening: {
          type: mongoose.Types.ObjectId,
          ref: "case-openings",
        },
        nonces: [Number]
      }],
      ready: Boolean
    }],
    winner: {
      type: mongoose.Types.ObjectId,
      ref: "users"
    },
    creator: {
      type: mongoose.Types.ObjectId,
      ref: "users"
    },
    dice: {
      type: mongoose.Types.ObjectId,
      ref: "dices"
    },
    userCount: {
      type: Number,
      default: 2
    },
    totalRounds: {
      type: Number,
      default: 1
    },
    currentRound: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: true
    },
    private: Boolean,
    totalWinning: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: Object.values(battleStatuses),
      default: battleStatuses.Pending
    }
  },
  {
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

// indexes
battleSchema.index({ creator: 1 });

battleSchema.plugin(timestamps);

const Battle = mongoose.model("battles", battleSchema);

Battle.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for Battle model, err: ${err}`);
  }
});

module.exports = Battle;
