const mongoose = require('mongoose');
const { shuffle } = require("lodash");
const User = require("../../models/user");
const Case = require("../../models/case");
const CaseOpening = require("../../models/case-opening");
const { errorMaker, statusCodes } = require("../../helpers");
const { userStatuses } = require("../../constants");
const logger = require("../logger");
const redis = require("../redis");

const getCaseOpening = async (userId, id, translate) => {
  try {
    const result = await CaseOpening.findById(id)
      .populate("dices")
      .lean();

    if (!result) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.unboxingNotExist'));
    }

    if (result.user !== userId) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('global.accessDenied'));
    }

    return result;
  } catch (error) {
    logger.log("Internal Server Error", { error });
    throw error;
  }
};

const getCaseOpenings = async ({ query, pagination }) => {
  try {
    let aggregateQuery = [
      {
        $lookup: {
          from: "site-items",
          localField: "winItems",
          foreignField: "_id",
          as: "winItems"
        }
      },
      {
        $lookup: {
          from: "dices",
          localField: "dices",
          foreignField: "_id",
          as: "dices"
        }
      },
      {
        $lookup: {
          from: "cases",
          localField: "case",
          foreignField: "_id",
          as: "case"
        }
      },
      {
        $project: {
          opening: {
            $map: {
              input: { $range: [0, { $size: "$winItems" }] },
              as: "index",
              in: {
                $mergeObjects: [
                  {
                    case: {
                      _id: { $arrayElemAt: ["$case._id", 0] },
                      name: { $arrayElemAt: ["$case.name", 0] },
                      price: { $arrayElemAt: ["$case.price", 0] }
                    }
                  },
                  {
                    item: {
                      _id: { $arrayElemAt: ["$winItems._id", "$$index"] },
                      name: { $arrayElemAt: ["$winItems.name", "$$index"] },
                      value: { $arrayElemAt: ["$winItems.value", "$$index"] },
                      color: { $arrayElemAt: ["$winItems.color", "$$index"] },
                      image: { $arrayElemAt: ["$winItems.image", "$$index"] }
                    },
                    dice: {
                      betId: { $arrayElemAt: ["$dices.betId", "$$index"] },
                      clientSeed: {
                        $arrayElemAt: ["$dices.clientSeed", "$$index"]
                      },
                      seed: { $arrayElemAt: ["$dices.seed", "$$index"] },
                      seedHash: { $arrayElemAt: ["$dices.seedHash", "$$index"] }
                    },
                    timestamp: { $arrayElemAt: ["$dices.updatedAt", "$$index"] }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $group: {
          _id: "$temp",
          result: { $addToSet: "$opening" }
        }
      },
      {
        $addFields: {
          result1: {
            $reduce: {
              input: "$result",
              initialValue: [],
              in: {
                $concatArrays: ["$$value", "$$this"]
              }
            }
          }
        }
      },
      { $unwind: "$result1" },
      {
        $replaceRoot: {
          newRoot: "$result1"
        }
      }
    ];

    if (query) {
      aggregateQuery.unshift({ $match: query });
    }
    if (pagination) {
      const { offset, limit } = pagination;
      aggregateQuery = aggregateQuery.concat([
        {
          $facet: {
            pagination: [
              { $count: "totalItems" },
              { $addFields: { page: offset, pageSize: limit } }
            ],
            items: [
              { $sort: { timestamp: -1 } },
              { $skip: limit * offset },
              { $limit: limit }
            ]
          }
        },
        { $unwind: "$pagination" }
      ]);
    }

    const [result] = await CaseOpening.aggregate(aggregateQuery).allowDiskUse(true);

    return result || [];
  } catch (error) {
    logger.log("Internal Server Error", { error });
    throw error;
  }
};

const getLatestLiveDrops = async () => {
  try {
    // get last added case opening
    const aggregateQuery = [
      { $match: {
        'winItems.0': { $exists: true },
        winItems: {
          $nin: [
            mongoose.Types.ObjectId("5e42739d11eb23f6508b0493"),
            mongoose.Types.ObjectId("5e42739d11eb23f6508b0492"),
            mongoose.Types.ObjectId("5e3efb514cff02420bf9ef21")
          ]
        }
      }},
      { $sort: {
        createdAt: -1
      }},
      { $limit: 1000 },
      { $lookup: {
        from: "cases",
        localField: "case",
        foreignField: "_id",
        as: "case"
      }},
      { $unwind: "$case" },
      { $match: {
        'case': { $exists: true },
        'case.isDisabled': { $ne: true },
      }},
      { $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user"
      }},
      { $unwind: "$user" },
      { $match: {
        'user': { $exists: true },
        'user.status' : { $ne: 'DISABLED' },
        'user.username': { $nin: ['oscar', 'jospoeze'] }
      }},
      { $lookup: {
        from: "site-items",
        localField: "winItems",
        foreignField: "_id",
        as: "item"
      }},
      { $unwind: "$item" },
      { $limit: 100 },
      { $project: {
        "user._id": 1,
        "user.username": 1,
        "user.unboxedCases": 1,
        "user.upgradedItems": 1,
        "user.createdAt": 1,
        "user.profileImageUrl": 1,
        "case._id": 1,
        "case.name": 1,
        "case.image": 1,
        "case.thumbnail": 1,
        "item.name": 1,
        "item.image": 1,
        "item.value": 1,
        "item.thumbnail": 1,
        "item.color": 1,
        "item.tag": 1,
        "item.type": 1
      }}
    ];

    const caseOpenings = await CaseOpening.aggregate(aggregateQuery).allowDiskUse(true);

    const normalUnboxings = caseOpenings
      .map(v => {
        const { user, case: openedCase, item } = v;

        return {
          user: {
            _id: user._id,
            name: user.username,
            image: user.profileImageUrl,
            unboxCount: user.unboxedCases,
            upgradeCount: user.upgradedItems,
            createdAt: user.createdAt
          },
          case: {
            id: openedCase._id,
            name: openedCase.name,
            image: openedCase.thumbnail || openedCase.image
          },
          item: {
            name: item.name,
            image: item.image,
            thumbnail: item.thumbnail || item.image,
            price: item.value,
            color: item.color,
            tag: item.tag || item.type
          }
        };
      });
    let expUnboxings = await redis.getAsync(redis.getKey('EXP_UNBOXING_KEY'));

    const result = [];
    for (let i = 0; i < 10; i ++) {
      const unboxingPool = Math.random() < 0.7 ? normalUnboxings : expUnboxings;
      result.push(unboxingPool[Math.floor(Math.random() * unboxingPool.length)]);
    }

    return result;
  } catch (err) {
    throw err;
  }
};

const getCaseIdFromCode = async (userId, code, translate) => {
  const user = await User.findById(userId).lean();
  if (user.freeboxCode) {
    throw errorMaker("BAD_REQUEST", translate('cases.notExitFreeBox'));
  }
  const caseIds = await Case.distinct('_id', { code });
  if (!caseIds.length) {
    throw new errorMaker('BAD_REQUEST', `Wrong code`);
    throw errorMaker("BAD_REQUEST", translate('cases.wrongCode'));
  }
  
  return {
    status: statusCodes.OK,
    message: statusCodes.getStatusText(statusCodes.OK),
    data: caseIds[0]
  };
}

module.exports = {
  getCaseOpening,
  getCaseOpenings,
  getLatestLiveDrops,
  getCaseIdFromCode
};
