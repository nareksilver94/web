// grab the mongoose module
const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const logger = require("../modules/logger.js");

const cachedImageSchema = mongoose.Schema(
  {
    originalImage: {
      type: String,
    },
    newImage: String,
    isThumbnail: {
      type: Boolean,
      default: false
    }
  },
  {
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

cachedImageSchema.index({ originalImage: 1 });

cachedImageSchema.plugin(timestamps);

const CachedImage = mongoose.model("cached-images", cachedImageSchema);

CachedImage.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for CachedImage model, err: ${err}`);
  }
});

module.exports = CachedImage;
