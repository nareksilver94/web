// grab the mongoose module
const mongoose = require("mongoose");
const { itemTypes } = require("../constants");
const logger = require("../modules/logger.js");

const itemSchema = mongoose.Schema(
  {
    // provider unique id
    assetId: {
      type: String,
    },
    name: {
      type: String,
    },
    type: {
      type: String,
      enum: Object.values(itemTypes)
    },
    tag: {
      type: String,
    },
    imageModified: {
      type: Boolean,
      default: false,      
    },    
    originalImage: String,
    image: String,
    originalThumbnail: String,
    thumbnail: String,
    value: {
      type: Number,
      default: 0,
    },
    availableVariants: [
      {
        props: Object,
        value: Number,
        name: String,
        image: String,
        asin: String,
        originalImage: String
      }
    ],
    lastPrices: [Number],
    color: String,
    descriptionText: String,
    descriptionBullets: [String],
    shippingInfo: {
      type: Map,
      of: {
        canDeliver: Boolean,
        estimatedShippingPrice: Number
      }
    },
    isDisabled: Boolean,
    isNameModified: Boolean,
    isPriceModified: Boolean
  },
  {
    timestamps: true,
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

itemSchema.index({ name: 'text' });
itemSchema.index({ assetId: 1 }, { unique: true });
itemSchema.index({ type: 1 });
itemSchema.index({ value: 1 });

const SiteItem = mongoose.model("site-items", itemSchema);

SiteItem.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for SiteItem model, err: ${err}`);
  }
});

module.exports = SiteItem;
