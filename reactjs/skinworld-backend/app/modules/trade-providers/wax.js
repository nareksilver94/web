const redis = require("redis");
const lock = require("redis-lock");
const OpTrade = require("@opskins/api");
const { promisify } = require("util");

const { errorMaker } = require("../../helpers");
const logger = require("../logger");
const { opskinsTradeOfferStatuses } = require("../../constants");

const OPSKINS_API_KEY = "5d6b8a1ad3f7721fb4e5e5c0d7f173";
const OPSKINS_USERID = 5776447;
const MODULE_NAME = "WAX";
const opTrade = new OpTrade(OPSKINS_API_KEY); // opTrade Initialized
let redisClient, redisLock, getAsync;

const initWaxRedis = () => {
  redisClient = redis.createClient(
    `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
  );
  redisLock = promisify(lock(redisClient));
  getAsync = promisify(redisClient.get).bind(redisClient);
};

/**
 *  OpSkins trade set UserInventory cache and cron
 */
const setUserInventoryCache = async () => {
  const key = `trade_${OPSKINS_USERID}`;
  const lockKey = `lock_trade_${key}`;
  const unlock = await redisLock(lockKey);
  try {
    await getUserInventory(OPSKINS_USERID)
      .then(result => redisClient.set(key, JSON.stringify(result)))
      .catch(err => {
        throw err;
      });
  } catch (err) {
    throw err;
  } finally {
    unlock();
  }
};

/**
 *  Opskins get inventory from cache
 */
const getInventory = async page => {
  try {
    const key1 = `trade_${OPSKINS_USERID}`;

    return Promise.all([
      getAsync(key1),
      opTrade.tradeGetOffers({ sort: "modified" })
    ])
      .then(([userItemsRes, allOfersRes]) => {
        // removing not tradable items
        let notAllowedItems = [];
        const pendingOffersStatuses = [opskinsTradeOfferStatuses.Active];
        const pendingOffers = allOfersRes.offers.filter(o =>
          pendingOffersStatuses.includes(o.state)
        );
        pendingOffers.forEach(
          o => (notAllowedItems = [...notAllowedItems, ...o.sender.items])
        );
        let response = JSON.parse(userItemsRes);
        response.items = response.items.filter(
          item =>
            notAllowedItems.findIndex(
              notAllowedItem => notAllowedItem.id === item.id
            ) < 0
        );

        const pageSize = 18;
        const pagination = {};

        response.items = response.items.map(item => ({
          ...item,
          name_color: item.color.replace("#", ""),
          icon_url: item.image["300px"] ? item.image["300px"] : item.image,
          value: item.suggested_price * 1000,
          type: item.category,
          assetId: item.id,
          appId: "wax"
        }));

        pagination.pageSize = pageSize;
        pagination.page = page;
        pagination.totalItems = response.items.length;

        if (page) {
          response.items = response.items.slice(
            (page - 1) * pageSize,
            page * pageSize
          );
        }

        response.pagination = pagination;

        return response;
      })
      .catch(error => {
        logger.error("Get Inventory error", { error, MODULE_NAME });
        return { error };
      });
  } catch (error) {
    logger.log("Get Inventory error", { error, MODULE_NAME });
    throw error;
  }
};

/**
 *  Get GetUserInventory from third party
 *  @param {int} app_id     Internal App ID (see ITrade/GetApps)
 *  @param {int} uid        User ID of user whose inventory you want to see
 */
const getUserInventory = (uid, appId) => {
  return opTrade.tradeGetUserInventory({
    uid: uid,
    app_id: appId
  });
};

module.exports = {
  initWaxRedis,
  getWaxInventory: getInventory,
  setWaxUserInventoryCache: setUserInventoryCache
};
