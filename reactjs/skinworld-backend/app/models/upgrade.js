// grab the mongoose module
const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const { winChanceDirections, upgradeStatuses } = require("../constants");
const UserItem = require("./user-item");
const Dice = require("./dice");
const logger = require("../modules/logger.js");

const upgradeSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users"
    },
    targetItems: [
      {
        type: mongoose.Types.ObjectId,
        ref: "site-items"
      }
    ],
    // source items in user-items reference
    userItems: [
      {
        type: mongoose.Types.ObjectId,
        ref: "user-items"
      }
    ],
    // source items in site-items reference
    sourceItems: [
      {
        type: mongoose.Types.ObjectId,
        ref: "site-items"
      }
    ],
    dice: {
      type: mongoose.Types.ObjectId,
      ref: "dices"
    },
    winChance: Number,
    winChanceDirection: {
      type: String,
      enum: Object.values(winChanceDirections),
      default: winChanceDirections.Up
    },
    multiplier: Number,
    status: {
      type: String,
      enum: Object.values(upgradeStatuses),
      default: upgradeStatuses.Lose
    }
  },
  {
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

upgradeSchema.index({ dice: 1 });
upgradeSchema.index({ status: 1 });
upgradeSchema.index({ user: 1 });
upgradeSchema.index({ createdAt: 1 });
upgradeSchema.index({ updatedAt: 1 });

upgradeSchema.plugin(timestamps);

upgradeSchema.pre("remove", async function(next) {
  await Dice.deleteOne({ _id: this.dice });
  next();
});

const Upgrade = mongoose.model("upgrades", upgradeSchema);

Upgrade.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for Upgrade model, err: ${err}`);
  }
});

module.exports = Upgrade;
