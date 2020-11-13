const mongoose = require('mongoose');
const Case = require("../../models/case");
const User = require("../../models/user");
const CaseItem = require("../../models/case-item");
const { validateCasePayload } = require("./helpers");
const { statusCodes, errorMaker } = require("../../helpers");
const { caseTypes } = require("../../constants");
const CaseStatistics = require("../../models/case-statistics");
const globalEvent = require("../event");
const logger = require("../logger");
const MODULE_NAME = "CASE_UPDATE";
const { translate } = require('../../i18n');

const updateCasePrices = async () => {
  try {
    const cases = await Case.find({ isDisabled: false }).populate({
      path: "items",
      populate: {
        path: "item",
        model: "site-items"
      }
    });

    for (let i = 0; i < cases.length; i++) {
      const payload = cases[i].toObject();

      if (payload.isPriceModified) {
        continue;
      }

      const result = await validateCasePayload(payload, true, translate);
      cases[i].price = result.price;
      await cases[i].save();
    }

    return;
  } catch (error) {
    throw error;
  }
};

async function addCategory(caseId, category, translate) {
  const addResult = await Case.updateOne(
    { _id: caseId },
    {
      $push: { caseTypes: category }
    }
  );

  if (addResult.nModified === 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.noCaseUpdated'));
  }

  return;
}

async function removeCategory(caseId, category, translate) {
  const removeResult = await Case.updateOne(
    { _id: caseId },
    { $pullAll: { caseTypes: [category] } }
  );

  if (removeResult.nModified === 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.noCaseUpdated'));
  }

  return;
}

async function addCaseItem(caseId, item, odd) {
  const caseItemResult = await CaseItem.insertMany([{
      item,
      odd
    }]);

  const addResult = await Case.updateOne(
    { _id: caseId },
    {
      $push: { items: caseItemResult }
    }
  );

  if (addResult.nModified === 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, "No case item was created");
  }

  return caseItemResult[0];
}

async function updateCaseItem(caseId, caseItemId, item, odd) {
  try{
    const caseItem = await CaseItem.findOne(
      { _id: caseItemId }
    );

    caseItem.item = item;
    caseItem.odd = odd;
    await caseItem.save();    
    return;
  } catch (error){
    throw errorMaker(statusCodes.BAD_REQUEST, "No case item was updated");
  }
}

async function removeCaseItem(caseId, caseItemId) {
  const removeResult = await Case.updateOne(
    { _id: caseId },
    { $pull: { items: { $in: [caseItemId] } } }
  );

  if (removeResult.nModified === 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, "No case item was deleted");
  }

  return;
}

async function updatePriorities(caseId, orders, translate) {
  const result = await Case.updateOne({ _id: caseId }, { $set: { orders } });

  if (result.nModified === 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.noCaseUpdated'));
  }

  return order;
}

async function claimCaseEarnings(userId) {
  const user = await User.findById(userId).lean();
  const earnings = user.caseEarnings;

  if (earnings === 0) {
    return;
  }

  await User.updateOne(
    { _id: userId },
    {
      $inc: { balance: earnings },
      $set: { caseEarnings: 0 }
    }
  );

  globalEvent.emit("socket.emit", {
    eventName: "user.balance",
    userId,
    value: user.balance + earnings,
    message: `$${earnings} added to your account`
  });

  return;
}

async function updateTop100Category() {
  logger.info("Starting upgrade Top 100 Case lists...", { MODULE_NAME });

  // update new cases
  let noneNewCaseIds = await Case.find({ isDisabled: false })
    .select("_id")
    .sort("-createdAt")
    .skip(100)
    .lean();
  noneNewCaseIds = noneNewCaseIds.map(v => v._id);

  await Case.updateMany(
    { _id: { $in: noneNewCaseIds } },
    { $pullAll: { caseTypes: [caseTypes.NEW_CASE] } }
  );

  // get top 100 cases by opens num
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
      $match: {
        opensNum: { $gt: 0 }
      }
    },
    {
      $sort: {
        opensNum: -1
      }
    },
    {
      $limit: 100
    }
  ]);

  // remove top 100 category from previous iteration
  await Case.updateMany({}, { $pullAll: { caseTypes: [caseTypes.TOP100] } });

  // form array with case ids, sort by ascend order
  const caseIds = aggregateResult
    .sort((a, b) => a.opensNum - b.opensNum)
    .map(v => v.case);

  if (caseIds.length === 0) {
    return;
  }

  // add TOP category
  const cases = await Case.find({ _id: { $in: caseIds } });
  for (let i = 0; i < cases.length; i ++) {
    const ranking = caseIds.findIndex(id => id.equals(cases[i]._id));

    cases[i].orders = cases[i].orders || new Map();
    cases[i].orders.set(caseTypes.TOP100, ranking + 1);
    cases[i].markModified('orders');
    cases[i].caseTypes.push(caseTypes.TOP100);
    cases[i].markModified('caseTypes');

    await cases[i].save();
  }

  return;
}

const updateCase = async (caseId, payload, translate) => {
  const session = await mongoose.startSession();

  try {
    let caseResult;

    await session.withTransaction(async () => {
      caseResult = await Case.findById(caseId).session(session);
      if (!caseResult) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.caseNotExist'));
      }

      payload.isPriceModified = caseResult.isPriceModified || payload.price !== undefined;

      if (payload.items && payload.items.length) {
        // remove old items
        await CaseItem.deleteMany({ _id: { $in: caseResult.items } }, { session });

        // insert new items
        const caseItemsResult = await CaseItem.insertMany(payload.items, {
          session
        });

        const priceTemp = payload.price;
        payload = await validateCasePayload(payload, false, translate);
        payload.items = caseItemsResult.map(v => v._id);

        // restore price since it is recalculated during validate
        if (payload.isPriceModified) {
          payload.price = priceTemp;
        }

        Object.assign(caseResult, payload);
      } else if (!payload.price) {
        caseResult = await validateCasePayload(
          Object.assign(caseResult, payload),
          true,
          translate,
        );
        payload.price = caseResult.price;
      } else {
        Object.assign(caseResult, payload);
      }

      await caseResult.save();
    });

    return caseResult;
  } catch(err) {
    throw err;
  } finally {
    session.endSession();
  }
};

const slugify = async (type) => {
  const query = {
    slug: { $exists: false }
  };
  if (type) {
    query.caseTypes = type;
  }

  const cases = await Case
    .find(query)
    .sort('createdAt');

  for (let i = 0; i < cases.length; i ++) {
    cases[i].markModified('name');
    const { slug, name } = await cases[i].save();
    console.log(name, '\t', slug);
  }
}

module.exports = {
  updateCasePrices,
  claimCaseEarnings,
  addCategory,
  removeCategory,
  addCaseItem,
  updateCaseItem,
  removeCaseItem,
  updatePriorities,
  updateTop100Category,
  updateCase,
  slugify
};
