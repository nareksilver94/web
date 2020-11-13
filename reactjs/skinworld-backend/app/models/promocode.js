// grab the mongoose module
const mongoose = require("mongoose");
const logger = require("../modules/logger.js");

const promocodeSchema = mongoose.Schema(
  {
    code: {
      type: String,
    },
    name: {
      type: String
    },
    // value between 1 ~ 99
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

promocodeSchema.index({ code: 1 }, { unique: true });

const Promocode = mongoose.model("promocodes", promocodeSchema);

Promocode.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for Promocode model, err: ${err}`);
  }
});

module.exports = Promocode;
