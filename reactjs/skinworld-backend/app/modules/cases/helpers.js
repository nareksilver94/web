const Item = require("../../models/site-item");
const { statusCodes, errorMaker } = require("../../helpers");
const { UNBOX_HOUSE_EDGE } = require("../../constants");
const logger = require("../logger");

const MAX_AFFILATE_CUT = 3;
const MAX_CASE_PRICE = 500;
const MIN_CASE_PRICE = 0.6;

const validateCasePayload = async (payload, isOnlyPrice, translate) => {
  try {
    let totalOdds = 0;
    let lowestItemPrice = Number.MAX_VALUE;
    let needToRefetch = true;

    const itemMapping = {};
    const itemIds = payload.items.map(item => {
      let key = item.item;
      if (typeof key !== "string") {
        key = key._id;
        needToRefetch = false;
      }
      itemMapping[key] = +item.odd;

      return key;
    });
    payload.price = 0;

    let items = payload.items.slice();

    if (needToRefetch) {
      items = await Item.find({ _id: { $in: itemIds } }).lean();

      if (items.length !== payload.items.length) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.invalidIdArray'));
      }
    } else {
      items = payload.items.map(item => item.item);
    }

    payload.items = [];
    itemIds.forEach(itemId => {
      const item = items.find(item =>
        needToRefetch ? item._id.equals(itemId) : item._id === itemId
      );

      if (!item.value || !itemMapping[itemId]) {
        return;
      }
      if (item.value < lowestItemPrice) {
        lowestItemPrice = item.value;
      }
      if (itemMapping[itemId] > 0 && item.value > 0) {
        const itemPrice =
          (item.value *
            itemMapping[itemId] *
            (1 + (payload.houseEdge || UNBOX_HOUSE_EDGE) / 100)) /
          100;
        payload.price += itemPrice;
        totalOdds = +(totalOdds + itemMapping[itemId]).toFixed(5);

        if (isOnlyPrice) {
          item.price = itemPrice;
        }
      }
      item.odd = itemMapping[itemId];

      payload.items.push(item);
    });

    if (!isOnlyPrice) {
      if (totalOdds !== 100) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.totalOdds100'));
      }
      if (lowestItemPrice * (1 + (payload.houseEdge || UNBOX_HOUSE_EDGE) / 100) >= payload.price) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.invalidOdds'))
      }
      if (payload.price < MIN_CASE_PRICE) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.casePriceLow', { value: MIN_CASE_PRICE }));
      }
      if (payload.price > MAX_CASE_PRICE) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.casePriceHigh', { value: MAX_CASE_PRICE }));
      }
      if (payload.affiliateCut > MAX_AFFILATE_CUT) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('validation.affliateCut'));
      }
    }

    payload.price = Number(payload.price.toPrecision(3));

    return payload;
  } catch (error) {
    logger.info("Internal Server Error", { error });
    throw error;
  }
};

module.exports = {
  validateCasePayload
};
