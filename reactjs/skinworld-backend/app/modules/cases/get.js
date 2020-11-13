const mongoose = require("mongoose");
const { omit, find } = require("lodash");
const Case = require("../../models/case");
const CaseStatistics = require("../../models/case-statistics");
const User = require("../../models/user");
const S3Module = require("../s3");
const logger = require("../logger");
const config = require("../../../config");
const { statusCodes, errorMaker, utils } = require("../../helpers");
const { validateCasePayload } = require("./helpers");
const { MIN_ORDERED_ITEMS_LENGTH } = require("../../constants");

const getCaseImages = async showOfficialImages => {
  const CASE_IMAGE_DIR = "images/case-images";
  const s3Infos = await S3Module.getFolderInfo(CASE_IMAGE_DIR);

  const images = s3Infos
    .filter(
      info =>
        info.Size > 0 &&
        (showOfficialImages ||
          !info.Key.split("/")
            .pop()
            .startsWith("OFFCL_"))
    )
    .map(info => `https://${config.app.s3Bucket}.s3.amazonaws.com/${info.Key}`);

  return images;
};

const getCase = async (id, populateStatistics, select = '') => {
  let query, result;

  if (utils.isValidId(id)) {
    query = { _id: id };
  } else {
    query = { slug: id };
  }

  try {
    const queryPromise = Case.findOne(query).populate({
      path: "items",
      populate: {
        path: "item",
        model: "site-items",
        select: "name image thumbnail color type tag assetId value"
      }
    });

    if (populateStatistics) {

      result = await queryPromise.lean();

      let aggregateQuery = [
        {
          $match: {'case': mongoose.Types.ObjectId(id)}
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user"
          }
        },
        {
          $unwind: "$user"
        },
        {
          $project: {
            _id: 0,
            "user.email": 1,
            "user.username": 1,
            "user.balance": 1,
            "user._id": 1,
            views: 1,
            opens: 1,
          }
        }
      ];

      let __query = CaseStatistics.aggregate(aggregateQuery).allowDiskUse(true);
      const data = await __query;
      result.statistics = data;
      
    } else {
      const selected_fields = select || "name items image price createdAt updatedAt";
      result = await queryPromise
        .select(selected_fields)
        .lean();
    }

    return result;
  } catch (error) {
    logger.log("Internal Server Error", { error });
    throw error;
  }
};

const getOrderedCaseItems = async (id, translate) => {
  let query;

  if (utils.isValidId(id)) {
    query = { _id: id };
  } else {
    query = { slug: id };
  }

  try {
    let caseResult = await Case.findOne(query)
      .populate({
        path: "items",
        populate: {
          path: "item",
          model: "site-items",
          select: "type color image name tag value"
        }
      })
      .select(
        "name slug caseTypes price items isPriceModified"
      )
      .lean();

    if (!caseResult) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.caseNotExist'));
    }
    const originalCasePrice = caseResult.price;

    caseResult.items.sort((a, b) => a.item.value - b.item.value);

    // add prices in case total, update if it is not synced
    caseResult = await validateCasePayload(caseResult, true, translate);
    if (caseResult.isPriceModified) {
      caseResult.price = originalCasePrice;
    } else if (caseResult.price !== originalCasePrice) {
      await Case.updateOne(query, { $set: { price: caseResult.price } });
    }

    // calculate orders
    const infoMapping = [];
    let totalOdd = 0;
    let highOddInfo = null;
    let highOdd = 0;

    // enlarge total count baesd in case item count
    let totalCount = caseResult.items.length * 5;
    if (totalCount < MIN_ORDERED_ITEMS_LENGTH) {
      totalCount = MIN_ORDERED_ITEMS_LENGTH;
    }

    for (let i = 0; i < caseResult.items.length; i++) {
      const item = caseResult.items[i];
      const info = {
        ...omit(item, ["createdAt", "updatedAt", "value", "lastPrices"]),
        rangeStart: +(totalOdd !== 0 ? totalOdd + 0.00001 : 0).toFixed(5),
        rangeEnd: +(totalOdd + item.odd).toFixed(5),
        price: item.value,
        count: Math.round((totalCount * item.odd) / 100),
        index: i
      };
      infoMapping.push(info);

      if (item.odd > totalOdd) {
        highOdd = item.odd;
        highOddInfo = info;
      }

      totalOdd = totalOdd + item.odd;
    }

    // get order item array
    // const orderArray = [];

    for (let i = 0; i < totalCount; i++) {
      const random = +(Math.random() * 100).toFixed(5);
      let info = infoMapping.find(
        v => v.rangeStart <= random && random <= v.rangeEnd
      );

      if (!info) {
        continue;
      }

      // find other items available
      if (info.count === 0) {
        info = infoMapping.find(v => v.count > 0);
        info = highOddInfo;
        info.count = 0;
      }

      // pop one item from given range
      if (info.count > 0) {
        info.count -= 1;
      }
      // orderArray.push(info._id);
    }

    const result = {
      itemInfo: infoMapping.map(v => omit(v, ["count"])),
      caseInfo: omit(caseResult, [
        "items",
        "isPriceModified",
      ]),
      // orderArray
    };

    return result;
  } catch (error) {
    logger.log("Internal Server Error", { error });
    throw error;
  }
};

const getCases = async ({ query, pagination, sort, select }) => {
  try {
    const _query = [
      { $match: query }
    ];

    const countResult = await Case.aggregate([
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

    if (select) {
      _query.push({ $project: select });
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

    let result = await Case.aggregate(_query).allowDiskUse(true);

    return {
      total,
      data: result.length ? result[0].data : []
    };

  } catch (error) {
    logger.log("Internal Server Error", { error });
    throw error;
  }
};

module.exports = {
  getCaseImages,
  getCases,
  getCase,
  getOrderedCaseItems
};
