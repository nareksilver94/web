const mongoose = require('mongoose');
const SiteItem = require("../../models/site-item");
const UserItem = require("../../models/user-item");
const logger = require("../../modules/logger");
const MODULE_NAME = "INVENTORY_CREATE";

const getSiteInventory = async (query = {}, pagination, sort, select) => {
  try {
    const _query = [
      { $match: query }
    ];

    const countResult = await SiteItem.aggregate([
      ..._query,
      { $group: {
        _id: null,
        total: { $sum: 1 }
      } }
    ]);

    const total = countResult.length ? countResult[0].total : 0;

    if (sort) {
      _query.push({ $sort: sort })
    }

    if (pagination) {
      _query.push(
        { $skip: pagination.offset * pagination.limit },
        { $limit: pagination.limit }
      );
    }

    _query.push(
      { $group: {
        _id: null,
        data: { $push: '$$ROOT' }
      } }
    );

    let result = await SiteItem.aggregate(_query).allowDiskUse(true); 

    return {
      total,
      data: result.length ? result[0].data : []
    };    
  } catch (error) {
    logger.error("Get Site Inventory Error", { error, MODULE_NAME, query });
    throw error;
  }
};

const getSiteItem = async (id, select) => {
  try {
    let queryPromise = SiteItem.findById(id);
    if (select) {
      queryPromise = queryPromise.select(select);
    }
    return await queryPromise.lean();
  } catch (error) {
    logger.error("Get Site Item Error", { error, MODULE_NAME, id });
    throw error;
  }
};

const getUserInventory = async (query = {}, pagination, sort) => {
  try {
    let __query;
    let isPaginated = true;

    let aggregateQuery = [
      {
        $lookup: {
          from: "site-items",
          localField: "item",
          foreignField: "_id",
          as: "item"
        }
      },
      {
        $unwind: "$item"
      },
      {
        $project: {
          "item.lastPrices": 0,
          "item.descriptionBullets": 0,
          "item.createdAt": 0,
          "item.updatedAt": 0,
          "item.isNameModified": 0,
          "item.isPriceModified": 0,
          "item.descriptionText": 0,
          "item.originalImage": 0,
          createdAt: 0,
          updatedAt: 0
        }
      }
    ];

    const { search, battle } = query;

    if (battle) {
      aggregateQuery.unshift({
        $match: { battle: mongoose.Types.ObjectId(battle) }
      });
    }
    if (search) {
      aggregateQuery.push({
        $match: {
          "item.name": { $text: { $search: search } },
          "item.name": { $regex: new RegExp(search, "i") }
        }
      });
    }

    const countResult = await UserItem.aggregate([
      ...aggregateQuery,
      { $group: {
        _id: null,
        total: { $sum: 1 }
      } }
    ]);
    const total = countResult.length ? countResult[0].total : 0;

    if (pagination) {
      const { limit, offset } = pagination;
      aggregateQuery = aggregateQuery.concat([
        {
          $facet: {
            items: [{ $skip: limit * offset }, { $limit: limit }]
          }
        }
      ]);
    } else {
      isPaginated = false;
    }
    if (sort) {
      const facetQuery = aggregateQuery.find(v => !!v.$facet);
      if (facetQuery) {
        facetQuery.$facet.items.unshift({ $sort: sort });
      }
      __query = UserItem.aggregate(aggregateQuery);

      if (__query && !facetQuery) {
        __query = __query.sort(sort);
      }
    } else {
      __query = UserItem.aggregate(aggregateQuery);
    }

    const aggResult = await __query;
    let result = [];

    if (aggResult) {
      result = isPaginated ? aggResult[0].items : aggResult;
    }
    return {
      total,
      data: result.filter(v => !!v.item)
    };
  } catch (error) {
    logger.error("Get User Inventory error", { error, MODULE_NAME, query });
    throw error;
  }
};

const getClosestSiteItem = async (price, multiplier = 1) => {
  try {
    const totalPrice = +price * multiplier;
    const result = await SiteItem.find({ value: { $gt: totalPrice } })
      .select("value assetId type color image name tag")
      .sort("value")
      .limit(1);

    return result;
  } catch (error) {
    logger.error("Get closest site item error", { error, MODULE_NAME, price });
    throw error;
  }
};

module.exports = {
  getSiteInventory,
  getUserInventory,
  getSiteItem,
  getClosestSiteItem
};
