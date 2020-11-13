const mongoose = require("mongoose");
const Upgrade = require("../../models/upgrade");
const UserItem = require("../../models/user-item");
const ProvablyFair = require("../probably-fair");
const { statusCodes, errorMaker } = require("../../helpers");
const { winChanceDirections, upgradeStatuses } = require("../../constants");
const User = require("../../models/user");
const logger = require("../logger");
const MODULE_NAME = "UPGRADE_UPDATE";
const { translate } = require('../../i18n');

/**
 * Process Upgrade using upgrade id
 *
 * @param {String} id       upgrade id
 * @param {String} userId   user id
 */
const processUpgrade = async (id, userId, translate) => {
  const session = await mongoose.startSession();

  try {
    let resp;

    await session.withTransaction(async () => {
      const upgrade = await Upgrade.findById(id)
        .populate("dice")
        .session(session);

      if (upgrade.user.toString() !== userId) {
        throw errorMaker(
          statusCodes.BAD_PERMISSION,
          translate('upgrades.notProcessUpgrade')
        );
      }

      const rollResult = await ProvablyFair.rollResult(
        upgrade.dice.betId,
        session,
        true,
        null,
        translate,
      );

      let isWin =
        (upgrade.winChanceDirection === winChanceDirections.Up &&
          rollResult.value >= 100 - upgrade.winChance) ||
        (upgrade.winChanceDirection === winChanceDirections.Down &&
          rollResult.value <= upgrade.winChance);
      let newInventoryItems = [];

      if (isWin) {
        // add upgraded items to user inventory
        const userItemsPayload = upgrade.targetItems.map(item => ({
          item,
          user: userId
        }));
        newInventoryItems = await UserItem.create(userItemsPayload, { session });
        upgrade.status = upgradeStatuses.Win;
      }

      // remove old items from user inventory
      await UserItem.deleteMany({ _id: { $in: upgrade.userItems } }).session(
        session
      );

      // remove userItems field after a roll
      upgrade.userItems = undefined;
      await upgrade.save();

      await User.updateOne({ _id: userId }, { $inc: { upgradedItems: 1 } });

      const newInventoryItemIds = newInventoryItems.map(v => v._id);

      newInventoryItems = await UserItem.find({
        _id: { $in: newInventoryItemIds }
      })
        .populate("item", "_id value assetId name type image")
        .lean();

      resp = { isWin, rollResult, newInventoryItems };
    });

    return resp;
  } catch (error) {
    logger.error("Upgrade update error", { error, MODULE_NAME });
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  processUpgrade
};
