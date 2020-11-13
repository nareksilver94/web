const bcrypt = require("bcrypt");
const { omit } = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");

const User = require('../../models/user');
const Case = require("../../models/case");
const CaseOpening = require("../../models/case-opening");

const { statusCodes, errorMaker } = require('../../helpers');
const { issueToken } = require('../auth');
const globalEvent = require('../event');
const logger = require('../logger');
const { translate } = require('../../i18n');
const { userStatuses } = require("../../constants");

const MODULE_NAME = 'USER_GET';

const unAllowedUserFields = [
  "password",
  "emailVerificationToken",
  "passwordResetToken",
  "promocodes",
  "ip"
];


const login = async (payload, translate) => {
  try {
    payload.email = payload.email.toLowerCase();

    let filter = {
      $or: [{ email: payload.email }, { username: payload.username }]
    };
    let user = await User.findOne(filter).lean();

    if (!user) {
      throw errorMaker(statusCodes.NOT_FOUND, translate('user.userNotFound'));
    }

    if (user.status === userStatuses.Disabled) {
      throw errorMaker(statusCodes.FORBIDDEN, translate('user.banned'));
    }

    if (
      !user.password ||
      !bcrypt.compareSync(payload.password, user.password)
    ) {
      throw errorMaker(statusCodes.UNAUTHORIZED, translate('user.invalidPassword'));
    }

    const token = await issueToken({
      id: user._id,
      type: user.type,
      email: user.email
    });

    const totalReferralInfo = await User.aggregate([
      {
        $match: { referredBy: user._id }
      },
      {
        $group: {
          _id: null,
          deposited: { $sum: '$depositedValue' },
        }
      }
    ]);

    user.referralDeposited = totalReferralInfo && totalReferralInfo.length
      ? totalReferralInfo[0].deposited
      : 0;

    return {
      user: omit(user, unAllowedUserFields),
      token
    };
  } catch (error) {
    throw error;
  }
};

const getUserInfo = async (payload, translate) => {
  try {
    let filter = {
      _id: payload.userId
    };

    let user = await User.findOne(filter).lean();
    if (!user) {
      throw errorMaker(statusCodes.NOT_FOUND, translate('user.userNotFound'));
    }

    const totalReferralInfo = await User.aggregate([
      {
        $match: { referredBy: user._id }
      },
      {
        $group: {
          _id: null,
          deposited: { $sum: '$depositedValue' },
        }
      }
    ]);

    user.referralDeposited = totalReferralInfo && totalReferralInfo.length
      ? totalReferralInfo[0].deposited
      : 0;

    return omit(user, unAllowedUserFields);
  } catch (error) {
    throw error;
  }
};

const getUsers = async ({ query, pagination, sort }) => {
  try {
    const _query = [
      { $match: query }
    ];
    const countResult = await User.aggregate([
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

    let result = await User.aggregate(_query).allowDiskUse(true);

    return {
      total,
      data: result.length ? result[0].data : []
    };
  } catch (error) {
    logger.error("Get users error", { error, MODULE_NAME });
    throw error;
  }
};

const getIPs = async ({ query, pagination, sort }) => {
  try {

    let aggregateQuery = [
      { $match: query },
      {
        $project:
        {
          _id: 1,
          ip: {$split:["$ip", ","]}
        }
      },
      {$unwind:"$ip"},
    ];

    aggregateQuery.push(
      {$group:{"_id":{ $trim: { input: "$ip" } },"count":{$sum:1}}},
      {$match : { count: { $gt: 3 } } }
    )

    if (sort) {
      aggregateQuery.push(
        { $sort: sort }
      );
    }

    aggregateQuery.push(
      {$group:{"_id":null,"ips":{$push:{"ip":"$_id","count":"$count"}}, total: {$sum: 1}}},
      {$project:{"_id":0,"ips":1, "total": 1}},
      {$project:{"_id":0,"total": 1, data:{$slice: ['$ips', pagination.offset * pagination.limit, pagination.limit]}}},
    );

    __query = User.aggregate(aggregateQuery);
    const result = await __query;
    return {data: result[0] ? result[0] : []};

  } catch (error) {
    logger.error("Get IPs error", { error, MODULE_NAME });
    throw error;
  }
};

const getUsersWithIP = async payload => {
  try {

    const ip = payload.ip;
    let aggregateQuery = [
      { $match : { ip : {$regex: new RegExp(ip, "i")} } },
      { $project: {
            "_id": 1,
            "username": 1,
            "createdAt": 1,
            "ip": 1,
            "status": 1
        }
      }
    ];

    __query = User.aggregate(aggregateQuery);
    const result = await __query;
    return {data: result};

  } catch (error) {
    logger.error("Get users with IP error", { error, MODULE_NAME });
    throw error;
  }
};

const getUser = payload => {
  return User.findById(payload.id)
    .then(user =>
      omit(user.toObject(), unAllowedUserFields)
    );
};

const checkRefCode = async code => {
  try {
    const count = await User.find({ referralCode: code }).countDocuments();
    return count === 0;
  } catch (err) {
    return false;
  }
};

const muteChat = async (userId, duration, translate) => {
  try {
    const user = await User.findById(userId);
    logger.info("Chat muting user", { user: userId, duration });
    if (!user) {
      throw errorMaker(statusCodes.NOT_FOUND, translate('user.userNotFound'));
    }

    user.chatMuteInfo = {
      minute: duration,
      timestamp: new Date()
    };
    await user.save();

    globalEvent.emit("socket.emit", {
      eventName: "user.muteChat",
      userId,
      value: duration,
      message: translate(
        `user.${duration === -1 ? 'banned' : 'banForXMins'}`,
        { duration }
      )
    });

    return;
  } catch (err) {
    throw err;
  }
};

const getUserDetail = async (id, pagination, sort) => {
  try {
    
    let aggregateQuery = [
      {
        $match : {
          user: new mongoose.Types.ObjectId(id)
        }
      },
      {
        $lookup: {
          from: "site-items",
          localField: "winItems",
          foreignField: "_id",
          as: "items"
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
        $unwind: '$case'
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
        $unwind: '$user'
      },      
      { $match: { 'items.0': { $exists: true } } },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          winItems: 1,
          'case._id': 1,
          'case.name': 1,
          'case.price': 1,
          "items._id": 1,
          "items.name": 1,
          "items.value": 1,
          "items.assetId": 1,
          "user.username": 1,
          "user.email": 1,
          "user.balance": 1,
          "user.depositedValue": 1
        }
      }
    ];
  
    const { offset, limit } = pagination;
    
    if (sort) {
      aggregateQuery.push(
        { $sort: sort }
      );
    }

    aggregateQuery = aggregateQuery.concat([
      {
        $facet: {
          pagination: [
            { $count: "total" },
          ],
          data: [
            { $skip: limit * offset },
            { $limit: limit }
          ]
        }
      },
      { $unwind: "$pagination" }
    ]);

    let [result] = await CaseOpening.aggregate(aggregateQuery);

    if (result) {
      result = {
        total: result.pagination.total,
        data: result.data.map(({ winItems, items, ...other}) => ({
          ...other,
          items: winItems.map(itemId => items.find(item => item._id.equals(itemId)))
        }))
      };
    } else {
      result = {
        total: 0,
        data: []
      }
    }

    return result;
  } catch (error) {
    logger.log("Internal Server Error", { error });
    throw error;
  }
};


module.exports = {
  login,
  getUserInfo,
  getUser,
  getUsers,
  checkRefCode,
  getIPs,
  getUsersWithIP,
  muteChat,
  getUserDetail
};
