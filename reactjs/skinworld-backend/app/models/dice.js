// grab the mongoose module
const mongoose = require("mongoose");
const autoIncrement = require("mongoose-auto-increment");
const { diceStatuses } = require("../constants");
const logger = require("../modules/logger.js");

autoIncrement.initialize(mongoose.connection);

const diceSchema = mongoose.Schema(
  {
    betId: {
      type: Number,
    },
    seed: {
      type: String,
    },
    seedHash: {
      type: String,
    },
    clientSeed: {
      type: String,
      required: true
    },
    index: {
      type: Number,
      required: true,
      default: 0
    },
    status: {
      type: String,
      enum: Object.values(diceStatuses),
      default: diceStatuses.Active
    },
    testing: Boolean,
  },
  {
    timestamps: true,
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

diceSchema.index({ betId: 1 });

diceSchema.plugin(autoIncrement.plugin, { model: "dices", field: "betId" });

const Dice = mongoose.model("dices", diceSchema);

Dice.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for Dice model, err: ${err}`);
  }
});

module.exports = Dice;
