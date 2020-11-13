const mongoose = require("mongoose");
const { statusCodes, utils } = require("../../helpers");
const Case = require("../../models/case");
const CaseStatistics = require("../../models/case-statistics");
const UserStatistics = require("../../models/user-statistics");
const User = require("../../models/user");
const logger = require("../logger");
const CaseOpening = require("../../models/case-opening");
const { userTypes } = require("../../constants");
const moment = require('moment');


async function getTotalProfit() {
  const aggregateResult = await Case.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$profit" }
      }
    }
  ]);

  let total = 0;

  if (aggregateResult.length !== 0) {
    total = aggregateResult[0].total;
  }

  return {
    total
  };
}

async function getCasesProfit(caseIds) {
  const cases = await Case.find({ _id: { $in: caseIds } }).lean();
  const profits = {};

  cases.forEach(caseItem => {
    let profit = caseItem.profit || 0;
    profits[caseItem._id.toString()] = profit;
  });

  return {
    profits
  };
}

async function getPopularCases(limit = 3) {
  const aggregateResult = await CaseStatistics.aggregate([
    {
      $group : { 
        _id : "$case",
        opensNum: { $sum: "$opens.all" }
      }
    },
    {
      $project: {
        _id: 0,
        case: "$_id",
        opensNum: 1
      }
    },
    {
      $sort: {
        opensNum: -1
      }
    },
    {
      $limit: limit
    }
  ]);

  return aggregateResult;
}

// return statistics for one case
async function getCaseStatistics(caseId) {
  const caseStatistics = {
    views: 0,
    opens: 0,
    canAfford: 0,
    totalViews: 0,
    totalOpens: 0,
    totalCanAfford: 0,
    firstViews: 0,
    firstOpens: 0,
    totalFirstOpens: 0,
    totalFirstViews: 0
  };

  // collect first opens/views
  const firstViewsOpens = await UserStatistics.aggregate([
    {
      $group: {
        _id: {
          views: { $eq: ["$firstViewedCase", mongoose.Types.ObjectId(caseId)] },
          opens: { $eq: ["$firstOpenedCase", mongoose.Types.ObjectId(caseId)] }
        },
        views: {
          $sum: {
            $cond: [{ $ne: [{ $type: "$firstViewedCase" }, "missing"] }, 1, 0]
          }
        },
        opens: {
          $sum: {
            $cond: [{ $ne: [{ $type: "$firstOpenedCase" }, "missing"] }, 1, 0]
          }
        }
      }
    }
  ]);

  for (const elem of firstViewsOpens) {
    if (elem._id.views === true) {
      caseStatistics.firstViews += elem.views;
    } else if (elem._id.opens === true) {
      caseStatistics.firstOpens += elem.opens;
    }

    caseStatistics.totalFirstViews += elem.views;
    caseStatistics.totalFirstOpens += elem.opens;
  }

  const totalViewsOpens = await CaseStatistics.aggregate([
    {
      $group : { 
        _id : "$case",
        opensNum: { $sum: "$opens.all" },
        viewsNum: { $sum: "$views.all" },
        canAffordNum: { $sum: "$views.canAfford" },
      }
    },
    {
      $project: {
        _id: 0,
        opensNum: 1,
        viewsNum: 1,
        canAffordNum: 1,
        case: "$_id",
      }
    },
    {
      $group: {
        _id: { $eq: ["$case", mongoose.Types.ObjectId(caseId)] },
        opensNum: { $sum: "$opensNum" },
        viewsNum: { $sum: "$viewsNum" },
        canAffordNum: { $sum: "$canAffordNum" }
      }
    }
  ]);

  for (const elem of totalViewsOpens) {
    if (elem._id === true) {
      caseStatistics.views += elem.viewsNum;
      caseStatistics.opens += elem.opensNum;
      caseStatistics.canAfford += elem.canAffordNum;
    }

    caseStatistics.totalViews += elem.viewsNum;
    caseStatistics.totalOpens += elem.opensNum;
    caseStatistics.totalCanAfford += elem.canAffordNum;
  }

  return caseStatistics;
}

async function addCaseView(id, userId = void 0, testing) {
  let caseId = id;

  if (!utils.isValidId(id)) {
    caseId = await Case.findOne({ slug: caseId }).distinct("_id");
  }

  if (userId !== void 0) {
    // update first viewed case if applicable
    const userStatistics = await UserStatistics.findOne({ user: userId })
      .select("firstViewedCase")
      .lean();

    if (userStatistics === null || userStatistics.firstViewedCase === void 0) {
      UserStatistics.updateOne(
        { user: userId },
        {
          $set: {
            firstViewedCase: caseId
          },
          $setOnInsert: {
            testing,
          },
        },
        { upsert: true }
      ).exec();
    }

    // retrieve user balance and case price to calculate if user can afford case on view moment
    const [{ balance: userBalance }, { price: casePrice }] = await Promise.all([
      User.findById(userId)
        .select("balance")
        .lean(),
      Case.findById(caseId)
        .select("price")
        .lean()
    ]);

    const canAfford = userBalance >= casePrice ? 1 : 0;

    CaseStatistics.updateOne(
      { 
        case: caseId,
        user: userId
      },
      {
        $inc: {
          'views.all': 1,
          'views.canAfford': canAfford
        },
        $setOnInsert: {
          testing,
        },
      },
      { upsert: true }
    ).exec();
  } else {
    
    caseStatistics = new CaseStatistics({
      case: caseId,
      testing,
    });

    await caseStatistics.save();

    CaseStatistics.updateOne(
      { case: caseId },
      {
        $inc: { unregisteredViews: 1 },
        $setOnInsert: {
          testing,
        },
      },
      { upsert: true }
    ).exec();
  }
}

async function addCaseOpening(caseId, userId, opensNum = 1, session, testing) {
  // update first opened case if applicable
  let userStatistics = await UserStatistics.findOne({ user: userId })
    .select("firstOpenedCase")
    .session(session);

  if (!userStatistics) {
    userStatistics = new UserStatistics({
      user: userId,
      firstOpenedCase: caseId,
      testing,
    });
  } else if (userStatistics.firstOpenedCase === void 0) {
    userStatistics.firstOpenedCase = caseId;
  }

  await userStatistics.save();

  // increment case openings
  await CaseStatistics.updateOne(
    { 
      case: caseId,
      user: userId
    },
    {
      $inc: { 
        'opens.all': opensNum,
      },
      $setOnInsert: {
        testing,
      },
    },
    {
      upsert: true,
      session
    }
  ).exec();
}

const getStatistics = async ({ query, pagination, sort }) => {
  try {
    let isSortedInAggregate = true;
    const { search, ...otherQuery } = query;

    const filterStage = [];
    if (query.search && search != "All") {
      let filterDate;
      if (search === 'Day') {
        filterDate = moment().subtract(1, 'days').toDate();
      }
      else if (search === 'Week') {
        filterDate = moment().subtract(7, 'days').toDate();
      } 
      else if (search === 'Month') {
        filterDate = moment().subtract(1, 'months').toDate();
      }
      else if (search === 'Year') {
        filterDate = moment().subtract(1, 'years').toDate();
      }      
      
      filterStage.push({
        $match: {
          createdAt: {
            $gte: filterDate,
          },
          // hard code admin users to improve performance
          user: {
            $nin: [
              mongoose.Types.ObjectId("5d3f4d2fa43af777c0546d6d"),
              mongoose.Types.ObjectId("5e41475a4cff02420bfa88dd"),
              mongoose.Types.ObjectId("5e4338c42586883ff760d55d"),
              mongoose.Types.ObjectId("5e5fb762091ba16ff8afbe4b"),
              mongoose.Types.ObjectId("5e6150bbbec28c5584cb760f"),
              mongoose.Types.ObjectId("5e657c47bec28c5584cd39da"),
              mongoose.Types.ObjectId("5e66218fc6b1af1de2498cf9"),
              mongoose.Types.ObjectId("5e66259fc6b1af1de2498dea"),
              mongoose.Types.ObjectId("5e7bc84081c56d16fb31f6e3"),
              mongoose.Types.ObjectId("5e7c9c8815e5ee0f6c0ccb12"),
              mongoose.Types.ObjectId("5e7d2edbe608b50f52d26f3e"),
              mongoose.Types.ObjectId("5e80986a8a49180f8ef17416"),
              mongoose.Types.ObjectId("5e847643bb79cf09f344eeb8"),
              mongoose.Types.ObjectId("5e87951ca77a80164f8ba589"),
              mongoose.Types.ObjectId("5e8f3f0b75267a0fc297fcfe"),
              mongoose.Types.ObjectId("5e9139f37f8219100c10daa0"),
              mongoose.Types.ObjectId("5e919d18f931330fcc6d98f0"),
              mongoose.Types.ObjectId("5e92f56583222f25fbd307ab"),
              mongoose.Types.ObjectId("5e963b9c41e5810fb943e69b"),
              mongoose.Types.ObjectId("5e96d2bff7dc380fab038f3f"),
              mongoose.Types.ObjectId("5e980e98eb000d1011cc427c")
            ]
          }
        }
      });
    }

    let aggregateQuery = [
      ...filterStage,     
      {
        $group: {
          _id: "$case",
          openingsNum: { $sum: 1 },
          users: { $push: "$user" },
        },
      },
      {
        $lookup: {
          from: "cases",
          localField: "_id",
          foreignField: "_id",
          as: "case"
        }
      },
      {
        $unwind: '$case'
      },  
      {
        $project: {
          _id: 0,
          caseId: '$_id',
          'openingsNum': 1,
          'case.name': 1,
          'case.price': 1,
          'case.image': 1,
          'case.unboxCounts': 1,
          'revenue': { 
            "$multiply": 
            [
              { "$ifNull": [ "$case.price", 0 ] }, 
              { "$ifNull": [ "$openingsNum", 0 ] } 
            ]
          }, 
          createdAt: 1,
        }
      }
    ];

    if (pagination) {
      const { offset, limit } = pagination;
      aggregateQuery = aggregateQuery.concat([
        {
          $facet: {
            pagination: [
              { $count: "total" },
            ],
            items: [
              { $sort: sort },
              { $skip: limit * offset },
              { $limit: limit }
            ]
          }
        },
        { $unwind: "$pagination" }
      ]);
    }

    const [data] = await CaseOpening.aggregate(aggregateQuery).allowDiskUse(true);

    const result = data
      ? {
        total: data.pagination.total,
        data: data.items
      }:
      { total: 0, data: [] }

    return result;
  } catch (error) {
    logger.error("Get statistics", { error });
    throw error;
  }
};

module.exports = {
  getTotalProfit,
  getCasesProfit,
  getPopularCases,
  addCaseView,
  addCaseOpening,
  getCaseStatistics,
  getStatistics
};
