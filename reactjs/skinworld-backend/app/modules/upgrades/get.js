const mongoose = require("mongoose");
const Upgrade = require("../../models/upgrade");
const { errorMaker } = require("../../helpers");
const logger = require("../logger");
const MODULE_NAME = "UPGRADE_GET";

const getUpgrades = async (query = {}, pagination, sort) => {
  try {
    let __query = Upgrade.find(query)
      .populate("targetItems", "_id name image color value")
      .populate("sourceItems", "_id name image color value")
      .populate("dice", "betId seed clientSeed seedHash")
      .populate("user", "username email profileImageUrl")
      .sort("-createdAt");

    if (pagination) {
      __query = __query
        .limit(pagination.limit)
        .skip(pagination.offset * pagination.limit);
    }
    if (sort) {
      __query = __query.sort(sort);
    }

    const items = await __query.lean();
    const totalCount = await Upgrade.find(query).countDocuments();

    return {
      pagination: { totalCount, ...pagination },
      items
    };
  } catch (error) {
    logger.error("Get upgrade error", { error, MODULE_NAME });
    throw error;
  }
};

module.exports = {
  getUpgrades
};
