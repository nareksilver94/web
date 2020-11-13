const mongoose = require("mongoose");
const User = require("../../models/user");
const SiteItem = require("../../models/site-item");
const UserItem = require("../../models/user-item");
const { errorMaker, statusCodes } = require("../../helpers");
const globalEvent = require("../event");
const logger = require("../logger");
const MODULE_NAME = "INVENTORY_UPDATE";

const sellItem = async (userId, itemIds, translate) => {
  const session = await mongoose.startSession();

  try {
    let resp, eventsToEmit, logs;

    await session.withTransaction(async () => {
      eventsToEmit = [];
      logs = [];

      const user = await User.findById(userId).session(session);
      if (!user) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('user.userNotExist'));
      }

      const userItems = await UserItem.find({
        _id: { $in: itemIds },
        user: user.id
      })
        .populate("item")
        .session(session);
      if (!userItems.length) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('user.itemNotExist'));
      }

      // update user balance
      if (user.balance === undefined) {
        user.balance = 0;
      }

      let totalBalance = 0;
      for (let i = 0; i < userItems.length; i++) {
        const userItem = userItems[i];
        totalBalance += userItem.item.value;
      }
      user.balance += totalBalance;
      await user.save();

      // remove user item
      await UserItem.deleteMany({ _id: { $in: itemIds } });

      eventsToEmit.push(["socket.emit", {
        eventName: "user.balance",
        userId,
        balance: user.balance,
        message: translate('user.balanceAdded', { value: totalBalance })
      }]);

      logs.push(['info', "Sell Item success", { MODULE_NAME, userId, totalBalance, itemIds }]);

      resp = { userBalance: user.balance };
    });

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }

    for (const [action, ...args] of logs) {
      logger[action](...args);
    }

    return resp;
  } catch (error) {
    logger.error("Sell Item error", { MODULE_NAME, error });
    throw error;
  } finally {
    session.endSession();
  }
};

const editItem = async (itemId, data, editorId, translate) => {
  try {
    const item = await SiteItem.findById(itemId);

    if (!item) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('user.itemNotExist'));
    }

    Object.assign(item, data, { isNameModified: true, isPriceModified: true });

    await item.save();

    return true;
  } catch (error) {
    logger.error("Inventory Edit Item error", {
      error,
      itemId,
      data,
      editorId
    });
    throw error;
  }
};

const updateItem = async (itemId, data, translate) => {
  try {
    const item = await SiteItem.findById(itemId);

    if (!item) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('user.itemNotExist'));
    }

    Object.assign(item, data);

    await item.save();

    return true;
  } catch (error) {
    logger.error("Inventory Update Item error", {
      error,
      itemId,
      data
    });
    throw error;
  }
};

module.exports = {
  sellItem,
  editItem,
  updateItem
};
