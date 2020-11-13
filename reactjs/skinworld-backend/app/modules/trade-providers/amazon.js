const config = require("../../../config");
const { errorMaker } = require("../../helpers");
const SiteItem = require("../../models/site-item");
const CachedImage = require("../../models/cached-image");
const { itemTypes, crawlTypes } = require("../../constants");
const stats = require("stats-lite");
const amazonCrawler = require("../../crawler/amazon");
const ImageModule = require("../image");
const { UrlDataPipe } = require("../image-pipe");
const { getItemColors } = require("../inventory/helpers");
const descProtoType = require("./descriptions");
const logger = require("../logger");
const globalEvent = require("../event");
const MODULE_NAME = "AMAZON";

// how many times to try retrieve prices
const FAIL_TRIES = 3;

async function updateMainCache(isForceUpdate) {
  // get all Amazon items from db
  const query = { type: itemTypes.Amazon };
  if (isForceUpdate) {
    query.name = { $exists: false };
    query.isDisabled = { $exists: false };
    // query.thumbnail = { $exists: false };
  }
  const items = await SiteItem.find(query);

  const urlPipe = new UrlDataPipe();
  ImageModule.setDataPipe(urlPipe);

  // calculate avg price
  for (const item of items) {
    let categoryData;

    for (let i = 0; i < FAIL_TRIES; ++i) {
      try {
        categoryData = await amazonCrawler.getCategoryMain(item.assetId);
      } catch (error) {
        categoryData = false;
      }

      if (categoryData !== false) {
        break;
      }
    }

    if (categoryData === false) {
      continue;
    }
    // new product page case
    if (categoryData.img === false && categoryData.variants.length === 0) {
      // categoryData.img = item.originalImage
      // categoryData.name = item.name
      continue;
    }

    // update db
    if (!item.isNameModified && categoryData.name !== false) {
      item.name = categoryData.name;
    }

    if (
      isForceUpdate ||
      (categoryData.img !== false && item.originalImage !== categoryData.img)
    ) {
      logger.info("Amazon image sync", { itemId: item._id, MODULE_NAME });
      item.originalImage = categoryData.img;

      try {
        const modifiedImage = await ImageModule.removeBackgroundAndUpload(
          categoryData.img
        );
        item.image = modifiedImage;
      } catch (error) {
        logger.error("Image magick remove background", {
          error,
          MODULE_NAME,
          imageUrl: categoryData.img
        });
        item.image = categoryData.img;
      }

      try {
        // generating thumbnail
        const dimension = 100;
        const modifiedThumbnailImage = await ImageModule.removeBackgroundAndUpload(
          categoryData.img,
          dimension
        );
        item.thumbnail = modifiedThumbnailImage;
      } catch (error) {
        logger.error("Image magick remove background", {
          error,
          MODULE_NAME,
          imageUrl: categoryData.img
        });
        item.thumbnail = categoryData.img;
      }
    }

    globalEvent.emit("socket.emit", {
      eventName: "sync",
      item: {
        name: item.name,
        assetId: item.assetId
      },
      type: "Price Sync (Amazon)",
      message: item.name
    });

    const minPrices = [];

    if (categoryData.itemType && categoryData.itemType == crawlTypes.Detail) {
      minPrices.push(categoryData.price)
    }
    for (const variant of categoryData.variants) {
      minPrices.push(variant.value);

      // remove image background if necessary
      if (variant.image !== void 0) {
        // trying to find item with same props so we can avoid excess processing
        const samePropsVariant = item.availableVariants.find(({ props }) => {
          try {
            if (
              Object.keys(variant.props).length !== Object.keys(props).length
            ) {
              return false;
            }

            for (const [propName, propValue] of Object.entries(props)) {
              if (propValue !== variant.props[propName]) {
                return false;
              }
            }
          } catch (e) {}

          return true;
        });

        if (
          !isForceUpdate &&
          (samePropsVariant !== void 0 &&
            variant.image === samePropsVariant.originalImage)
        ) {
          // image already processed
          variant.originalImage = variant.image;
          variant.image = samePropsVariant.image;
        } else {
          variant.originalImage = variant.image;

          try {
            const cachedImage = await CachedImage.findOne({
              originalImage: variant.image,
              isThumbnail: true
            }).lean();

            if (cachedImage) {
              variant.image = cachedImage.newImage;
            } else {
              const dimension = 100;
              const modifiedImage = await ImageModule.removeBackgroundAndUpload(
                variant.image,
                dimension
              );
              variant.image = modifiedImage;

              const cachedImage = new CachedImage({
                originalImage: variant.originalImage,
                newImage: variant.image,
                isThumbnail: true
              });
              await cachedImage.save();
            }
          } catch (error) {
            variant.image = item.image;
            logger.error("Some error while processing amazon variant image", {
              error,
              MODULE_NAME
            });
          }
        }
      }
    }

    if (!item.isPriceModified) {
      item.availableVariants = categoryData.variants;
      if (minPrices.length !== 0) {
        // calculate new price
        const medianPrice = stats.median(minPrices);

        item.lastPrices.push(medianPrice);
        item.value = medianPrice;

        item.markModified("lastPrices");
      }
    }

    item.color = getItemColors(item.value);

    item.save();
  }

  globalEvent.emit("socket.emit", {
    eventName: "sync",
    type: "Price Sync (Amazon)",
    message: "Finished successfully!"
  });
}

async function updateDescriptionCache() {
  // get all Amazon items from db
  const items = await SiteItem.find({ type: itemTypes.Amazon });
  const typeKeys = Object.keys(descProtoType).map(key => ({
    key,
    value: key.toLowerCase()
  }));

  for (const item of items) {
    let shippingInfo;
    let itemDescription;

    for (let i = 0; i < FAIL_TRIES; ++i) {
      shippingInfo = await amazonCrawler.getCategoryShipping(item.assetId);

      if (shippingInfo === false) {
        continue;
      } else {
        break;
      }
    }

    for (let i = 0; i < FAIL_TRIES; ++i) {
      itemDescription = await amazonCrawler.getCategoryDescription(
        item.assetId
      );

      if (itemDescription === false) {
        continue;
      } else {
        break;
      }
    }

    globalEvent.emit("socket.emit", {
      eventName: "sync",
      item: {
        name: item.name,
        assetId: item.assetId
      },
      type: "Desc Sync (Amazon)",
      message: item.name
    });

    if (itemDescription !== false) {
      if (itemDescription.descriptionText !== void 0) {
        item.descriptionText = itemDescription.descriptionText;
      }

      if (itemDescription.descriptionBullets.length !== 0) {
        item.descriptionBullets = itemDescription.descriptionBullets;
      }
    } else {
      const itemName = item.name.toLowerCase();
      typeKeys.forEach(v => {
        if (itemName.indexOf(v.value) !== -1) {
          item.descriptionText = descProtoType[v.key];
        }
      });
    }

    if (shippingInfo !== false) {
      item.shippingInfo = shippingInfo;
    }

    await item.save();
  }

  globalEvent.emit("socket.emit", {
    eventName: "sync",
    type: "Desc Sync (Amazon)",
    message: "Finished successfully!"
  });
}

module.exports = {
  syncAmazonMain: updateMainCache,
  syncAmazonDesc: updateDescriptionCache
};
