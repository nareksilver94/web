// grab the mongoose module
const mongoose = require("mongoose");
const logger = require("../modules/logger.js");

const itemSchema = mongoose.Schema(
  {
    item: {
      type: mongoose.Types.ObjectId,
      ref: "site-items"
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "users"
    },
    battle: {
      type: mongoose.Types.ObjectId,
      ref: "battles"
    },
    testing: Boolean,
  },
  {
    timestamps: true,
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

itemSchema.index({ user: 1 });

const UserItem = mongoose.model("user-items", itemSchema);

UserItem.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for UserItem model, err: ${err}`);
  }
});

module.exports = UserItem;
