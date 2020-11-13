const SiteItem = require("../../models/site-item");
const logger = require("../../modules/logger");
const { getItemColors } = require("./helpers");
const MODULE_NAME = "INVENTORY_CREATE";

const addSiteItems = async (payload, userId) => {
  try {
    // remove existing items in payload
    const req = [{
      ...payload,
      color: getItemColors(payload.value)
    }];
    const assetIds = req.map(item => item.assetId);
    const items = await SiteItem.find({ assetId: { $in: assetIds } })
      .select("assetId")
      .lean();

    logger.info(`Site items are added by ${userId}`, {
      user: userId,
      MODULE_NAME,
      assetIds
    });

    const newPayload = req.filter(
      item => items.find(v => v.assetId !== item.assetId) === undefined
    );
    return await SiteItem.insertMany(newPayload);
  } catch (error) {
    logger.log("Internal Server Error", { error, MODULE_NAME });
    throw error;
  }
};

module.exports = {
  addSiteItems
};
