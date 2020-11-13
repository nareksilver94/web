const mongoose = require("mongoose");
const logger = require("../modules/logger.js");

const giftcardSchema = mongoose.Schema(
  {
    codes: [
      {
        type: String,
      }
    ],
    name: {
      type: String
    },
    url: {
      type: String
    },
    value: {
      type: Number
    }
  },
  {
    timestamps: true,
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

giftcardSchema.index({ codes: 1 }, { unique: true });

const Giftcard = mongoose.model("giftcards", giftcardSchema);

Giftcard.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for Giftcard model, err: ${err}`);
  }
});

module.exports = Giftcard;
