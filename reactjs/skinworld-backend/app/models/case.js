// grab the mongoose module
const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const { caseTypes } = require("../constants");
const CaseItems = require("./case-item");
const logger = require("../modules/logger.js");
const slugify = require("mongoose-slug-generator");

const caseSchema = mongoose.Schema(
  {
    name: {
      type: String,
    },
    caseTypes: [
      {
        type: String,
        enums: Object.values(caseTypes),
      }
    ],
    creator: {
      type: mongoose.Types.ObjectId,
      ref: "users"
    },
    image: String,
    thumbnail: String,
    price: {
      type: Number,
      required: true
    },
    items: [
      {
        type: mongoose.Types.ObjectId,
        ref: "case-items"
      }
    ],
    affiliateCut: Number,
    earning: {
      type: Number,
      default: 0
    },
    unboxCounts: {
      type: Number,
      default: 0
    },
    profit: {
      type: Number,
      default: 0
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
    orders: {
      type: Map,
      of: Number
    },
    houseEdge: Number,
    slug: {
      type: String,
      slug: "name",
      unique_slug: true,
      permanent: true,
    },
    isPriceModified: Boolean,
    oddRange: mongoose.SchemaTypes.Mixed
  },
  {
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

caseSchema.index({ name: 'text', slug: 'text' });
caseSchema.index({ slug: 1 }, { unique: true });
caseSchema.index({ name: 1 });
caseSchema.index({ caseTypes: 1 });
caseSchema.index({ isDisabled: 1 });

caseSchema.plugin(timestamps);
caseSchema.plugin(slugify);

// remove relevants
caseSchema.pre("remove", async function(next) {
  await CaseItems.remove({ _id: { $in: this.items } });
  next();
});

const Case = mongoose.model("cases", caseSchema);

Case.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for Case model, err: ${err}`);
  }
});

module.exports = Case;
