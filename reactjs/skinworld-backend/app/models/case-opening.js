// grab the mongoose module
const mongoose = require("mongoose");
const logger = require("../modules/logger.js");
const Dice = require("./dice");

const caseOpeningSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Types.ObjectId,
      ref: "cases",
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },
    dices: [
      {
        type: mongoose.Types.ObjectId,
        ref: "dices",
      }
    ],
    winItems: [
      {
        type: mongoose.Types.ObjectId,
        ref: "site-items",
      }
    ],
    dice: {
      type: mongoose.Types.ObjectId,
      ref: "dices",
    },
    nonces: [Number],
    testing: Boolean,
  },
  {
    timestamps: true,
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

caseOpeningSchema.index({
  case: 1,
  user: 1,
});

caseOpeningSchema.index({
  dices: 1,
});

// remove relevants
caseOpeningSchema.pre("remove", async function(next) {
  await Dice.remove({ _id: { $in: this.dices } });
  next();
});

const CaseOpening = mongoose.model("case-openings", caseOpeningSchema);

CaseOpening.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for CaseOpening model, err: ${err}`);
  }
});

module.exports = CaseOpening;
