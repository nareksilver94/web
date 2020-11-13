const request = require("request-promise-native");
// const redis = require('redis');
const config = require("../../../config");
const { errorMaker } = require("../../helpers");
const SiteItem = require("../../models/site-item");
const CachedImage = require("../../models/cached-image");
const { itemTypes } = require("../../constants");
const stats = require("stats-lite");
const stockxCrawler = require("../../crawler/stockx");
const { getItemColors } = require("../inventory/helpers");
const ImageModule = require("../image");
const { UrlDataPipe } = require("../image-pipe");
const descProtoType = require("./descriptions");
const logger = require("../logger");
const globalEvent = require("../event");
const MODULE_NAME = "STOCKX";

// [0] is original name, [1] is transformed(DB) name
// const COLLECTED_PROPS = [
//   // ['colorway', 'Color'],
//   ['shoeSize', 'size'],
// ];

// how many times to try retrieve prices
const PRICES_FAIL_TRIES = 3;
const DESC_FAIL_TRIES = 3;

async function updatePricesCache(isForceUpdate) {
  // get all Stockx items from db
  const query = { type: itemTypes.Stockx };
  if (isForceUpdate) {
    query.name = { $exists: false };
    // query.thumbnail = { $exists: false };
  }
  const items = await SiteItem.find(query);
  const urlPipe = new UrlDataPipe();
  ImageModule.setDataPipe(urlPipe);

  // sync items available varians and prices
  for (const item of items) {
    let productData;

    for (let i = 0; i < PRICES_FAIL_TRIES; ++i) {
      try {
        productData = await stockxCrawler.getProductData(item.assetId);
      } catch (error) {
        productData = false;
      }

      if (productData !== false) {
        break;
      }
    }

    if (!productData) {
      continue;
    }

    const children = productData.children;

    delete productData.children;

    // push parent object itself into list of childrends
    // children[productData.id] = productData;

    // collect available prices and sizes
    const categoryPrices = [];
    const availableVariants = [];

    for (const childId in children) {
      const child = children[childId];

      // don't add because there is no such item on market
      if (child.market.lowestAsk === void 0 || child.market.lowestAsk === 0) {
        continue;
      }

      categoryPrices.push(child.market.lowestAsk);

      const props = {};

      if (child.shoeSize !== void 0 && child.shoeSize.length !== 0) {
        props["Size"] = child.shoeSize;
      }

      availableVariants.push({
        props,
        value: child.market.lowestAsk * 1.1
      });
    }

    if (!categoryPrices.length) {
      item.isDisabled = true;
      await item.save();
      continue;
    }

    // calculate new price for item
    const medianPrice = stats.median(categoryPrices);

    if (!item.isPriceModified) {
      item.lastPrices.push(medianPrice);
      item.availableVariants = availableVariants;
      item.value = medianPrice;
      item.markModified("lastPrices");
    }
    item.color = getItemColors(item.value);

    if (!item.isNameModified) {
      item.name = productData.title;
    }

    if (
      isForceUpdate ||
      (productData.media.imageUrl &&
        item.originalImage !== productData.media.imageUrl)
    ) {
      logger.log("Stockx image sync", { itemId: item._id, MODULE_NAME });

      globalEvent.emit("socket.emit", {
        eventName: "sync",
        item: {
          name: item.name,
          assetId: item.assetId
        },
        type: "Price Sync (Stockx)",
        message: item.name
      });

      const cachedImage = await CachedImage.findOne({
        originalImage: productData.media.imageUrl
      }).lean();

      if (cachedImage) {
        item.image = cachedImage.newImage;
      } else {
        const modifiedImage = await ImageModule.removeBackgroundAndUpload(
          productData.media.imageUrl
        );
        item.image = modifiedImage;
        item.originalImage = productData.media.imageUrl;

        const cachedImage = new CachedImage({
          originalImage: item.originalImage,
          newImage: item.image
        });
        await cachedImage.save();
      }

      // generating thumbnail
      const cachedThumbnailImage = await CachedImage.findOne({
        originalImage: productData.media.imageUrl,
        isThumbnail: true
      }).lean();

      if (cachedThumbnailImage) {
        item.thumbnail = cachedThumbnailImage.newImage;
      } else {
        const dimension = 100;
        const modifiedImage = await ImageModule.removeBackgroundAndUpload(
          productData.media.imageUrl,
          dimension
        );
        item.thumbnail = modifiedImage;
        item.originalThumbnail = productData.media.imageUrl;

        const cachedThumbnailImage = new CachedImage({
          originalImage: item.originalThumbnail,
          newImage: item.thumbnail,
          isThumbnail: true
        });
        await cachedThumbnailImage.save();
      }
    }

    item.isDisabled = false;

    await item.save();
  }

  globalEvent.emit("socket.emit", {
    eventName: "sync",
    type: "Price Sync (Stockx)",
    message: "Finished successfully!"
  });
}

async function updateDescriptionCache() {
  // get all Stockx items from db
  const items = await SiteItem.find({ type: itemTypes.Stockx });
  const typeKeys = Object.keys(descProtoType).map(key => ({
    key,
    value: key.toLowerCase()
  }));

  // sync items available varians and prices
  for (const item of items) {
    let productData;

    for (let i = 0; i < DESC_FAIL_TRIES; ++i) {
      try {
        productData = await stockxCrawler.getProductData(item.assetId);
      } catch (error) {
        productData = false;
      }

      if (productData !== false) {
        break;
      }
    }

    if (productData === false) {
      continue;
    }

    if (item.shippingInfo === void 0) {
      item.shippingInfo = new Map();
    }

    // update description
    globalEvent.emit("socket.emit", {
      eventName: "sync",
      item: {
        name: item.name,
        assetId: item.assetId
      },
      type: "Desc Sync (Stockx)",
      message: item.name
    });

    if (productData.description) {
      item.descriptionText = productData.description || void 0;
    } else {
      const itemName = item.name.toLowerCase();
      typeKeys.forEach(v => {
        if (itemName.indexOf(v.value) !== -1) {
          item.descriptionText = descProtoType[v.key];
        }
      });
    }

    // finding child with sku uuid to get estimated shipping price
    const appropChild = Object.values(productData.children).find(child => {
      if (child.skuUuid !== null) {
        return true;
      }

      return false;
    });

    if (appropChild === false) {
      item.shippingInfo.delete("US");
    } else {
      const { lowestAsk, skuUuid } = appropChild.market;

      const estimatedShippingPrice = await stockxCrawler.getEstimatedShippingPrice(
        skuUuid,
        lowestAsk
      );

      if (estimatedShippingPrice === false) {
        item.shippingInfo.set("US", {
          canDeliver: true,
          estimatedShippingPrice: 13.95
        });
        item.shippingInfo.set("UK", {
          canDeliver: true,
          estimatedShippingPrice: 17.44
        });
        item.shippingInfo.set("CA", {
          canDeliver: true,
          estimatedShippingPrice: 22.81
        });
        item.shippingInfo.set("EU", {
          canDeliver: true,
          estimatedShippingPrice: 16.71
        });
      } else {
        item.shippingInfo.set("US", {
          canDeliver: true,
          estimatedShippingPrice
        });
      }
    }

    await item.save();
  }

  globalEvent.emit("socket.emit", {
    eventName: "sync",
    type: "Desc Sync (Stockx)",
    message: "Finished successfully!"
  });
}

module.exports = {
  syncStockxPrices: updatePricesCache,
  syncStockxDesc: updateDescriptionCache
};
