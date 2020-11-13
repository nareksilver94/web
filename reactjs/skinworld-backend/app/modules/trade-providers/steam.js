const SteamUser = require("steam-user");
const SteamTotp = require("steam-totp");
const SteamCommunity = require("steamcommunity");
const TradeOfferManager = require("steam-tradeoffer-manager");
const request = require("request");
const promiseReq = require("request-promise-native");

const querystring = require("querystring");
const User = require("../../models/user");
const SiteItem = require("../../models/site-item");
const Transaction = require("../../models/transaction");
const AffiliateModule = require("../affiliate");
const redis = require("../redis");
const { getItemColors } = require("../inventory/helpers");
const {
  referralOpTypes,
  depositTypes,
  transactionStatuses,
  transactionTypes
} = require("../../constants");
const globalEvent = require("../event");
const logger = require("../logger");
const { pick } = require("lodash");
const MODULE_NAME = "STEAM";

const { errorMaker, statusCodes } = require("../../helpers");
const { translate } = require('../../i18n');

const STEAM_APPS_ALLOWED = [
  "730_2", // csgo
  "433850_1", // h1z1
  "440_2", // tf2
  "570_2", //dota2
  "252490_2" // rust
];

// Julenissen_1 / D9YnHbpunG4Dubp / IZykZLOq11k7QPhyNXU6iHnLI/I=

let redisClient, redisLock, getAsync, client, community, manager;
let asyncCreateOffer;

// const login = "Julenissen_10";
// const pass = "cc7bccb851Y";
// const sharedSecret = "Rr0CRN5dXsPT3yaUi8A13nOb8sM=";
// const identitySecret = "IRQPOQ1AGljkcY0TAgNbaME1ozg=";

const login = "skinworld5";
const pass = "H7P8s9utWTGyk5k";
const sharedSecret = "ouWppS/O/orvBYtQ8R/ITKB7j8o=";
const identitySecret = "jv5EkSt7m6wG92ZCqtils+eYpbk=";

const initSteamListeners = () => {
  client = new SteamUser();
  community = new SteamCommunity();
  manager = new TradeOfferManager({
    steam: client,
    community: community,
    language: "en",
    cancelTime: 300000,
    pollData: JSON.parse(redis.get("pollData"))
  });

  client.logOn({
    accountName: login,
    password: pass,
    twoFactorCode: SteamTotp.generateAuthCode(sharedSecret)
  });

  client.on("loggedOn", (details, parental) => {
    logger.info("Steam logged on", {
      MODULE_NAME,
      details: {
        ...pick(details, ["client_supplied_steamid", "ip_country_code"])
      }
    });
    logger.info("Logged in steam account", {
      steamId: client.steamID,
      MODULE_NAME
    });
    client.setPersona(SteamUser.EPersonaState.Online);
  });

  client.on("webSession", (sessionid, cookies) => {
    manager.setCookies(cookies);
    community.setCookies(cookies);

    logger.info("Web Session started", { MODULE_NAME });
  });

  manager.on("pollData", pollData => {
    redisClient.set("pollData", JSON.stringify(pollData));
  });

  manager.on("newOffer", offer => {
    // Accept trades from our admin account
    // Don't accept if we are giving items
    cosole.log("New offer: ", offer);
    if (
      offer.partner.getSteamID64() === "76561198425467607" &&
      offer.itemsToGive.length === 0
    ) {
      offer.accept((error, status) => {
        if (error) {
          logger.error("Steam offer accept error", { error, MODULE_NAME });
        } else {
          logger.info("Accepted offer", { status, MODULE_NAME });
        }
      });
    } else {
      offer.decline(error => {
        if (err) {
          logger.error("Steam offer decline error", { error, MODULE_NAME });
        } else {
          logger.info("Canceled offer from scammer", {
            scammerId: offer.partner.getSteamID64(),
            MODULE_NAME
          });
        }
      });
    }
  });

  offerMessageRegex = /#(\d+)/;

  manager.on("sentOfferChanged", (offer, oldState) => {
    if (!offer.isOurOffer || offer.isGlitched()) {
      logger.error("Bad trade", { offer, MODULE_NAME });
      return;
    } else {
      logger.info("Offer changed", { offer, MODULE_NAME });
    }

    switch (offer.state) {
      case TradeOfferManager.ETradeOfferState.Accepted:
        offer.getReceivedItems(async (err, items) => {
          if (err !== null) {
            logger.error("Some error while fetching received items", err);
            return;
          }

          // extract all appId-contextId combinations
          const appKeys = items.reduce((accum, { appid, contextid }) => {
            const alreadyHere = accum.some(appKey => {
              return (
                appKey["appId"] === appid && appKey["contextId"] === contextid
              );
            });

            if (alreadyHere === false) {
              accum.push({
                appId: appid,
                contextId: contextid
              });
            }

            return accum;
          }, []);

          // fetch prices for all app keys
          const prices = {};

          for (const appKey of appKeys) {
            const appPrices = await getSteamCachedItemsPriceList(
              appKey["appId"],
              appKey["contextId"],
              false,
              translate,
            );

            const appKeyString = `${appKey["appId"]}_${appKey["contextId"]}`;
            prices[appKeyString] = appPrices;
          }

          // calculate all items cost
          let cost = 0;

          const partnerSteamId = offer.partner.getSteamID64();

          items.forEach(item => {
            const marketName =
              item.market_hash_name || item.market_name || item.name;
            const appKeyString = `${item.appid}_${item.contextid}`;
            const itemPriceObj = prices[appKeyString][marketName];

            if (itemPriceObj === void 0) {
              console.error(
                `Can't find price for item on steam depositing, offer id: ${offer.id}, item:`,
                item
              );
              return;
            }

            const itemPrice = itemPriceObj.value;

            if (itemPrice === void 0) {
              console.error(
                `Can't find item price, offer id: ${offer.id}, item:`,
                item
              );
              return;
            }

            let totalPrice = itemPrice;

            if (Number.isInteger(item.amount)) {
              totalPrice = totalPrice * item.amount;
            }

            cost = cost + totalPrice;
          });

          // update transaction & add balance to user acc
          const tx = await Transaction.findOne({ extId: offer.id });
          const user = await User.findOne({ "steam.id": partnerSteamId });

          if (!user) {
            logger.error("Couldn't find user", {
              userSteamId: partnerSteamId,
              MODULE_NAME
            });
            return;
          }

          if (tx) {
            if (tx.coupon === user.depositCoupon) {
              cost *= 1.1;
              user.depositCoupon = null;
            }

            tx.value = cost;
            tx.status = transactionStatuses.Completed;
            await tx.save();
          }

          user.balance += cost;
          user.depositedValue += cost;
          await user.save();

          globalEvent.emit("socket.emit", {
            eventName: "user.balance",
            userId: user._id.toString(),
            balance: user.balance,
            deposited: user.depositedValue,
            type: 'DEPOSIT',
            message: `$${cost} added to your account.`
          });

          // add referral fee
          await AffiliateModule.addRefFee(
            { "steam.id": partnerSteamId },
            cost,
            referralOpTypes.STEAM_DEPOSIT,
            null,
            translate
          );
        });

        break;
      case TradeOfferManager.ETradeOfferState.Countered:
        offer.decline();
        return;
      case TradeOfferManager.ETradeOfferState.Expired:
      case TradeOfferManager.ETradeOfferState.Canceled:
      case TradeOfferManager.ETradeOfferState.Declined:
        // SteamWithdrawal.findOneAndUpdate({ id }, { status: 'FAILED' }).exec();
        break;
      case TradeOfferManager.ETradeOfferState.InvalidItems:
      case TradeOfferManager.ETradeOfferState.Invalid:
        if (offer.tradeID == null) {
          logger.error("Bad tradeID", { offer, MODULE_NAME });
          return;
        }
        break;
    }
  });
};

const getInventoryFromSteam = (appId, contextId) => {
  return new Promise((resolve, reject) => {
    manager.getInventoryContents(
      appId,
      contextId,
      false,
      (err, inventory, currencies) => {
        if (error) {
          logger.error("Get inventory from steam", { error, MODULE_NAME });
          return reject(error);
        }

        resolve(inventory);
      }
    );
  });
};

const getSteamPriceFromSteamlytics = () => {
  return new Promise((resolve, reject) => {
    const apiKey = "2e5de81d47657bec0f907df982d4eb3a";
    const url = `http://api.csgo.steamlytics.xyz/v2/pricelist/compact?key=${apiKey}`;
    const headers = { "Content-Type": "application/json" };

    request(url, { headers }, (err, resp, body) => {
      if (err) {
        return reject(body);
      }

      body = JSON.parse(body);

      if (!body.success) {
        return reject(errorMaker(null, body.message));
      }

      resolve(result);
    });
  });
};

const getSteamPrices = gameId => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.STEAM_PRICE_API_KEY;
    const url = `https://api.steamapis.com/market/items/${gameId}?api_key=${apiKey}`;
    const headers = { "Content-Type": "application/json" };

    request(url, { headers }, (err, resp, body) => {
      if (err) {
        return reject(err);
      }

      body = JSON.parse(body);

      resolve(body.data);
    });
  });
};

/**
 * Get cached steam item prices
 */
const getSteamCachedItemsPriceList = async (appId, contextId, forceLoad, translate) => {
  const contextKey = `${appId}_${contextId}`;
  const key = `prices_${contextKey}`;
  let valueStr = await redis.getAsync(key);

  if (!valueStr || forceLoad) {
    const lockKey = `lock_${key}`;

    const unlock = await redis.lock(lockKey);

    let prices = null;
    let assetIdMarketNameMap = {};

    try {
      if (STEAM_APPS_ALLOWED.indexOf(contextKey) === -1) {
        throw errorMaker(null, translate('tradeproviders.notFindAppKey'));
      }

      prices = await getSteamPrices(appId);

      const result = {};

      prices.forEach(item => {
        const name = item.market_hash_name || name;
        const savedItem = {
          value: item.prices.latest
        };

        assetIdMarketNameMap[item.assetid] = name;

        result[name] = savedItem;

        if (contextKey === "730_2") {
          const regex = /^(?<weapon>.+) \| (?<skin>.+) \((?<quality>.+)\)/;

          const splitted = name.match(regex);

          if (splitted && splitted.groups) {
            Object.assign(savedItem, splitted.groups);

            // modifying quality string
            try {
              const temp = savedItem.quality.split("-");
              if (temp[0] && temp[1]) {
                savedItem.quality = temp[0].charAt(0) + temp[1].charAt(0);
              }
            } catch (error) {
              logger.error("Get steam from price list - quality parsing", {
                error,
                MODULE_NAME
              });
            }
          }
        }
      });

      // update color/prices
      if (forceLoad) {
        dbItems = await SiteItem.find({ type: "STEAM" }).select("name");

        for (let i = 0; i < dbItems.length; i++) {
          if (!result[dbItems[i].name]) {
            continue;
          }
          dbItems[i].value = result[dbItems[i].name].value;
          dbItems[i].color = getItemColors(result[dbItems[i].name].value || 0);
          await dbItems[i].save();
        }
      }

      redis.set(key, JSON.stringify(result));
    } catch (err) {
      throw err;
    } finally {
      unlock();
    }

    valueStr = await getAsync(key);
  }

  if (!valueStr) {
    throw errorMaker(null, translate('tradeproviders.unknownWrongGetPrice'));
  }

  return JSON.parse(valueStr);
};

async function getUserInventory(userId, { appId, contextId, startAssetId }, translate) {
  const appKey = `${appId}_${contextId}`;

  if (STEAM_APPS_ALLOWED.indexOf(appKey) === -1) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('tradeproviders.notFindAppKey'));
  }

  const qs = {
    l: "english",
    count: "5000"
  };

  if (startAssetId !== void 0) {
    qs.start_assetid = startAssetId;
  }

  // fetch steam id and trade url
  const user = await User.findById(userId)
    .select("steam")
    .lean();

  let steamId;

  if (user.steam !== void 0) {
    steamId = user.steam.id;
  }

  // user havn't linked steam account
  if (steamId === void 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('tradeproviders.steamAccount'));
  }

  if (user.steam.tradeUrl === void 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('tradeproviders.tradeURL'));
  }

  // fetch inventory from steam
  const inventory = await promiseReq({
    uri: `https://steamcommunity.com/inventory/${steamId}/${appId}/${contextId}?${querystring.stringify(
      qs
    )}`,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64; rv:67.0) Gecko/20100101 Firefox/67.0"
    }
  })
    .then(resp => JSON.parse(resp))
    .catch(error => {
      logger.error("Error while fetching inventory from steam", {
        error,
        MODULE_NAME
      });

      return false;
    });

  if (inventory === false) {
    throw errorMaker(statusCodes.BAD_GATEWAY, translate('tradeproviders.notFetchInventory'));
  }

  if (inventory.total_inventory_count === 0) {
    // no items found for app key
    return [];
  }

  // change structure for performance
  const descriptionToClassid = {};

  inventory.descriptions.forEach(desc => {
    descriptionToClassid[desc.classid] = desc;
  });

  // get items prices
  const prices = await getSteamCachedItemsPriceList(appId, contextId, false, translate);

  const processedInventory = [];

  inventory.assets.forEach(asset => {
    const desc = descriptionToClassid[asset.classid];

    // shouldn't be a case, just to be safe
    if (desc === void 0) {
      return;
    }

    // pass not tradable and not marketable
    if (desc.tradable === 0 || desc.marketable === 0) {
      return;
    }

    const marketName = desc.market_hash_name || desc.market_name;
    const price = prices[marketName];

    // no market price, pass
    if (price === void 0) {
      return;
    }

    processedInventory.push({
      assetId: asset.assetid,
      marketName: desc.market_name,
      icon: `https://steamcommunity-a.akamaihd.net/economy/image/${desc.icon_url}`,
      price: price.value,
      amount: parseInt(asset.amount)
    });
  });

  // return inventory
  return processedInventory;
}

async function updateTradeUrl(userId, tradeUrl, translate) {
  // update db
  const updateResult = await User.updateOne(
    { _id: userId },
    { "steam.tradeUrl": tradeUrl }
  );

  if (updateResult.nModified === 0) {
    throw errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('tradeproviders.notUpdateTradeURL'));
  }

  return;
}

async function sendTradeOffer(userId, items, coupon, translate) {
  // fetch steam.id and steam.tradeUrl
  const user = await User.findById(userId)
    .select("steam")
    .lean();

  let steamId;

  if (user.steam !== void 0) {
    steamId = user.steam.id;
  }

  // user havn't linked steam account
  if (steamId === void 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('tradeproviders.steamAccount'));
  }

  if (user.steam.tradeUrl === void 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('tradeproviders.tradeURL'));
  }

  // rename item props, remove disallowed items
  const offerItems = [];

  items.forEach(item => {
    const appKey = `${item.appId}_${item.contextId}`;

    if (STEAM_APPS_ALLOWED.indexOf(appKey) === -1) {
      // app isn't allowed
      return;
    }

    offerItems.push({
      assetid: item.assetId,
      appid: item.appId,
      contextid: item.contextId,
      amount: item.amount
    });
  });

  const tradeAccessToken = querystring.parse(user.steam.tradeUrl).token;

  // create offer
  const offer = manager.createOffer(steamId, tradeAccessToken);

  // add items to offer
  offer.addTheirItems(offerItems);

  // send offer
  const offerId = await new Promise((resolve, reject) => {
    offer.send(async (error, status) => {
      if (error !== null) {
        logger.error("Sending offer error", { error, MODULE_NAME });

        return reject(errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('tradeproviders.notCreateTradeOffer')));
      }

      if (status === "pending") {
        // We need to confirm it
        community.acceptConfirmationForObject(
          identitySecret,
          offer.id,
          async err => {
            if (err !== null) {
              logger.error("Accepting offer confirmation error", {
                error,
                offerId: offer.id,
                MODULE_NAME
              });

              reject(errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('tradeproviders.notCreateTradeOffer')));
            } else {
              // create transaction
              await new Transaction({
                transactionType: transactionTypes.Deposit,
                subType: depositTypes.Steam,
                status: transactionStatuses.Pending,
                user: userId,
                coupon,
                extId: offer.id
              }).save();

              resolve(offer.id);
            }
          }
        );
      } else {
        // create transaction
        await new Transaction({
          transactionType: transactionTypes.Deposit,
          subType: depositTypes.Steam,
          status: transactionStatuses.Pending,
          user: userId,
          coupon,
          extId: offer.id
        }).save();

        resolve(offer.id);
      }
    });
  });

  return {
    offerId
  };
}

const syncSteamInventoryCache = async () => {
  for (const ctx of STEAM_APPS_ALLOWED) {
    const detail = ctx.split("_");

    await getSteamCachedItemsPriceList(detail[0], detail[1], true, translate);
  }
};

module.exports = {
  STEAM_APPS_ALLOWED,
  initSteamListeners,
  syncSteamInventoryCache,
  getSteamCachedItemsPriceList,
  getUserInventory,
  sendTradeOffer,
  updateTradeUrl
};
