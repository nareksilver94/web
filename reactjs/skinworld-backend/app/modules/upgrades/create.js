const mongoose = require("mongoose");
const { pick } = require("lodash");
const Upgrade = require("../../models/upgrade");
const SiteItem = require("../../models/site-item");
const UserItem = require("../../models/user-item");
const ProvablyFair = require("../probably-fair");
const { errorMaker, statusCodes } = require("../../helpers");
const { UPGRADE_HOUSE_EDGE } = require("../../constants");
const logger = require("../logger");
const MODULE_NAME = "UPGRADE_CREATE";
const { translate } = require('../../i18n');

/**
 * Get auto target items based on multiplier and item array
 *
 * @param {Object} payload
 * @param {Array} payload.userItems         array of user item id
 * @param {Array} payload.targetItems       array of site item id
 * @param {Number} payload.multiplier       multiplier
 * @param {String} payload.winChanceDirection   'UP' | 'DOWN'
 * @param {String} payload.seed             client seed
 * @param {String} payload.user             user id
 */
const createUpgrade = async (payload, translate) => {
  const session = await mongoose.startSession();

  try {
    let resp;

    await session.withTransaction(async () => {
      const itemSelectStr = "_id value assetId name type image";
      const userItems = await UserItem.find({
        _id: {
          $in: payload.userItems
        }
      })
        .populate("item", itemSelectStr)
        .lean();

      if (userItems.length !== payload.userItems.length) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('upgrades.nonExistRecodeId'));
      }

      const sourceItems = userItems.map(v => v.item);
      if (sourceItems.length !== payload.userItems.length) {
        throw errorMaker(
          statusCodes.BAD_REQUEST,
          translate('upgrades.recordsOfnotExistSiteItem')
        );
      }

      // calculate multiplier
      const totalSumPrice = sourceItems.reduce((acc, v) => acc + v.value, 0);

      let targetItems = [];
      let multiplier = 0;

      const targetItemsMongoIds = payload.targetItems.map(v =>
        mongoose.Types.ObjectId(v)
      );
      const [grouped] = await SiteItem.aggregate([
        { $match: { _id: { $in: targetItemsMongoIds } } },
        { $group: { _id: null, total: { $sum: "$value" } } }
      ]);

      if (!grouped) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('upgrades.itemArrayIsEmpty'));
      }

      targetItems = payload.targetItems;
      multiplier = grouped.total / totalSumPrice;

      if (!multiplier || multiplier < 1) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('upgrades.notUpgradeitem'));
      }

      multiplier = multiplier.toFixed(2);

      const winChance = (
        (100 / multiplier) *
        (1 - UPGRADE_HOUSE_EDGE / 100)
      ).toFixed(2);

      // create dice
      const dice = await ProvablyFair.createDice(payload.seed, session);

      // create upgrade
      await Upgrade.createCollection();
      const sourceItemIds = sourceItems.map(v => v._id);

      const upgradePayload = {
        userItems: payload.userItems,
        sourceItems: sourceItemIds,
        targetItems: payload.targetItems,
        user: payload.user,
        dice: dice._id,
        winChance,
        winChanceDirection: payload.winChanceDirection,
        multiplier
      };
      const [upgrade] = await Upgrade.create([upgradePayload], { session });

      resp = {
        ...pick(upgrade, [
          "_id",
          "winChance",
          "multiplier",
          "winChanceDirection"
        ]),
        userItems,
        targetItems,
        winChance,
        dice
      };
    });

    return resp;
  } catch (error) {
    logger.error("Create upgrade error", { error, MODULE_NAME });
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  createUpgrade
};
