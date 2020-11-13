// grab the mongoose module
const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const logger = require("../modules/logger.js");

const caseItemSchema = mongoose.Schema(
  {
    item: {
      type: mongoose.Types.ObjectId,
      ref: "items",
    },
    odd: {
      type: Number,
      required: true
    }
  },
  {
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);



caseItemSchema.plugin(timestamps);

const CaseItem = mongoose.model("case-items", caseItemSchema);

CaseItem.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for CaseItem model, err: ${err}`);
  }
});

module.exports = CaseItem;
