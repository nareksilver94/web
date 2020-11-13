const Transaction = require("../../models/transaction");
const logger = require("../logger");
const MODULE_NAME = "TRANSACTION_GET";

const getTransactions = async ({ query, pagination, sort, populate }) => {
  try {
    let __query;
    let isSortedInAggregate = true;
    const { search, ...otherQuery } = query;

    let aggregateQuery = [
      {
        $match: otherQuery
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
          "user.email": 1,
          "user.username": 1,
          "user._id": 1,
          _id: 1,
          status: 1,
          subType: 1,
          transactionType: 1,
          extId: 1,
          value: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ];
    if (query.search) {
      aggregateQuery.push({
        $match: {
          "user.username": { $text: { $search: search } },
          "user.username": new RegExp(search, "i")
        }
      });
    }

    if (sort) {
      aggregateQuery.push({ $sort: sort })
    }

    aggregateQuery.push(
      { $group: {
        _id: null,
        total: { $sum: 1 },
        results: { $push: '$$ROOT' }
      } },
      { $project: {
        _id: 0,
        total: 1,
        data: { $slice: ['$results', pagination.offset * pagination.limit, pagination.limit] }
      } }
    );

    __query = Transaction.aggregate(aggregateQuery).allowDiskUse(true);

    const data = await __query;
    
    return data.length ? data[0]: { total: 0, data: []};
  } catch (error) {
    logger.error("Get Transaction error", { error, MODULE_NAME });
    throw error;
  }
  
};

module.exports = {
  getTransactions
};
