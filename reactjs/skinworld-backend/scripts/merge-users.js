/*
 * merge duplicated(by email) users objects
 */

const User = require('../app/models/user.js');
const CaseOpening = require('../app/models/case-opening.js');
const CaseStatistics = require('../app/models/case-statistics.js');
const Case = require('../app/models/case.js');
const Message = require('../app/models/message.js');
const Room = require('../app/models/room.js');
const Transaction = require('../app/models/transaction.js');
const Upgrade = require('../app/models/upgrade.js');
const UserItem = require('../app/models/user-item.js');
const UserStatistics = require('../app/models/user-statistics.js');
const mongoose = require("mongoose");
const config = require("../config");
const { userTypes, userStatuses } = require("../app/constants");
const { getLevelByRefCount } = require('../app/modules/affiliate/index.js');

(async () => {
  await connectToMongo();

  let duplicatedEmails;

  try {
    duplicatedEmails = await User.aggregate([
      {
        $group: {
          _id: '$email',
          count: { $sum: 1 },
        }
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);
  } catch (err) {
    console.error('Error while aggregating duplicated emails, exit', err);
    return process.exit(1);
  }

  if (duplicatedEmails.length === 0) {
    console.log('There is no duplicated emails, exit');
    return process.exit(0);
  }
  else {
    const recordsNum = duplicatedEmails.reduce((accum, value) => {
      return accum + value.count;
    }, 0);

    console.log(`There is ${duplicatedEmails.length} duplicated emails, overall num of records with duplicates is ${recordsNum}, merging...`);
  }

  let accountsMerged = 0;
  let accountsDeleted = 0;

  for (const { _id: email, count: dupNum } of duplicatedEmails) {
    console.log(`\nMerge ${dupNum} records with ${email} email`);
    
    let users;

    try {
      let stats;

      const session = await mongoose.startSession();

      await session.withTransaction(async () => {
        stats = {};

        const users = await User.find({
          email,
        })
          .session(session);

        const freshUser = users.reduce((accum, value) => {
          if (value.google.id !== void 0 && accum.google.id === void 0) {
            // google first
            accum = value;
          }
          else if (value.facebook.id !== void 0 && accum.facebook.id === void 0) {
            // then facebook
            accum = value;
          }
          else if (value.updatedAt > accum.updatedAt) {
            // then by last active time
            accum = value;
          }
          else if (value.updatedAt === accum.updatedAt) {
            if (value.createdAt < accum.createdAt) {
              accum = value;
            }
          }

          return accum;
        }, users[0]);

        stats.freshUserId = freshUser.id;

        const usersToRemove = users
          .filter(user => user !== freshUser);

        console.log(freshUser, usersToRemove);

        const usersIdsToRemove = usersToRemove.map(user => user.id);
        stats.usersIdsToRemove = usersIdsToRemove;

        const userMergeData = {
          // to add
          addDepositedValue: 0,
          addBalance: 0,
          addReferredUserCount: 0,
          addTotalReferralFee: 0,
          addAvailableReferralFee: 0,
          addCaseEarnings: 0,
          addUnboxedCases: 0,
          addUpgradedItems: 0,
          addPromocodes: [],

          // to set
          isDisabled: false,
          isFreeboxOpened: false,
          isTosApproved: false,
          rewardsTwitter: false,
          rewardsFacebook: false,
          rewardsDiscord: false,
          rewardsEmail: false,
          referralLevel: void 0,
          referredBy: void 0,
          google: void 0,
          facebook: void 0,
          ip: void 0,
          shippingAddress: void 0,
        };

        for (const user of usersToRemove) {
          userMergeData.addDepositedValue += user.depositedValue;
          userMergeData.addBalance += user.balance;
          userMergeData.addReferredUserCount += user.referredUserCount;
          userMergeData.addTotalReferralFee += user.totalReferralFee;
          userMergeData.addAvailableReferralFee += user.availableReferralFee;
          userMergeData.addCaseEarnings += user.caseEarnings;
          userMergeData.addUnboxedCases += user.unboxedCases
          userMergeData.addUpgradedItems += user.upgradedItems;
          if (user.promocodes !== void 0 && user.promocodes.length !== 0) {
            userMergeData.addPromocodes.push(...user.promocodes);
          }

          if (
            user.status === userStatuses.Disabled
            && freshUser.status !== userStatuses.Disabled
          ) {
            userMergeData.isDisabled = true;
          }

          if (
            user.hasFreeboxOpened === true
            && freshUser.hasFreeboxOpened === false
          ) {
            userMergeData.isFreeboxOpened = true;
          }

          if (
            user.rewards.twitter.claimed === true
            && freshUser.rewards.twitter.claimed === false
          ) {
            userMergeData.rewardsTwitter = true;
          }

          if (
            user.rewards.facebook.claimed === true
            && freshUser.rewards.facebook.claimed === false
          ) {
            userMergeData.rewardsFacebook = true;
          }

          if (
            user.rewards.discord.claimed === true
            && freshUser.rewards.discord.claimed === false
          ) {
            userMergeData.rewardsDiscord = true;
          }

          if (
            user.rewards.email.claimed === true
            && freshUser.rewards.email.claimed === false
          ) {
            userMergeData.rewardsEmail = true;
          }

          if (
            user.tosApproved === true
            && freshUser.tosApproved === false
          ) {
            userMergeData.isTosApproved = true;
          }

          if (
            user.referredBy !== void 0
            && freshUser.referredBy === void 0
          ) {
            userMergeData.referredBy = user.referredBy;
          }

          if (
            user.google !== void 0
            && freshUser.google === void 0
          ) {
            userMergeData.google = user.google;
          }

          if (
            user.facebook !== void 0
            && freshUser.facebook === void 0
          ) {
            userMergeData.facebook = user.facebook;
          }

          if (
            user.shippingAddress !== void 0
            && freshUser.shippingAddress === void 0
          ) {
            userMergeData.shippingAddress = user.shippingAddress;
          }

          if (user.ip !== void 0) {
            // IP
            const userIps = user.ip.split(', ');
            let currentIps = [];

            if (freshUser.ip !== void 0) {
              currentIps = freshUser.ip.split(', ');
            }

            const initialIpsNum = currentIps.length;

            for (const ip of userIps) {
              if (currentIps.includes(ip) === false) {
                currentIps.push(ip);
              }
            }

            if (initialIpsNum !== currentIps.length) {
              userMergeData.ip = currentIps.join(', ');
            }
          }
        }

        const newReferralLevel = getLevelByRefCount(freshUser.referredUserCount + userMergeData.addReferredUserCount);

        if (newReferralLevel > freshUser.referralLevel) {
          userMergeData.referralLevel = newReferralLevel;
        }

        let result;

        const updateSet = {};

        if (userMergeData.isDisabled === true) {
          updateSet.status = userStatuses.Disabled;
        }

        if (userMergeData.isFreeboxOpened === true) {
          updateSet.hasFreeboxOpened = true;
        }

        if (userMergeData.isTosApproved === true) {
          updateSet.tosApproved = true;
        }

        if (userMergeData.rewardsTwitter === true) {
          updateSet['rewards.twitter.claimed'] = true;
        }

        if (userMergeData.rewardsFacebook === true) {
          updateSet['rewards.facebook.claimed'] = true;
        }

        if (userMergeData.rewardsDiscord === true) {
          updateSet['rewards.discord.claimed'] = true;
        }

        if (userMergeData.rewardsEmail === true) {
          updateSet['rewards.email.claimed'] = true;
        }

        if (userMergeData.referralLevel !== void 0) {
          updateSet.referralLevel = userMergeData.referralLevel;
        }

        if (userMergeData.referredBy !== void 0) {
          updateSet.referredBy = userMergeData.referredBy;
        }

        if (userMergeData.google !== void 0) {
          updateSet.google = userMergeData.google;
        }

        if (userMergeData.facebook !== void 0) {
          updateSet.facebook = userMergeData.facebook;
        }

        if (userMergeData.ip !== void 0) {
          updateSet.ip = userMergeData.ip;
        }

        if (userMergeData.shippingAddress !== void 0) {
          updateSet.shippingAddress = userMergeData.shippingAddress;
        }

        const updatePush = {};

        if (userMergeData.addPromocodes.length !== 0) {
          updatePush.promocodes = {
            $each: userMergeData.addPromocodes,
          };
        }

        result = await freshUser.updateOne({
          $inc: {
            balance: userMergeData.addBalance,
            depositedValue: userMergeData.addDepositedValue,
            referredUserCount: userMergeData.addReferredUserCount,
            totalReferralFee: userMergeData.addTotalReferralFee,
            availableReferralFee: userMergeData.addAvailableReferralFee,
            caseEarnings: userMergeData.addCaseEarnings,
            unboxedCases: userMergeData.addUnboxedCases,
            upgradedItems: userMergeData.addUpgradedItems,
          },
          $set: updateSet,
          $push: updatePush,
        })
          .session(session);

        if (result.nModified !== 1) {
          throw new Error(`${result.nModified} record was modified(should be 1) on user collection merge`);
        }

        stats.userData = userMergeData;

        result = await CaseOpening.updateMany(
          {
            user: {
              $in: usersIdsToRemove,
            },
          },
          {
            $set: {
              user: freshUser.id,
            },
          },
        )
          .session(session);

        stats.caseOpeningsMerged = result.nModified;

        result = await CaseStatistics.updateMany(
          {
            ...usersIdsToRemove.map(id => [`perUser.${id}`, { $exists: true }]),
          },
          {
            $unset: {
              ...usersIdsToRemove.map(id => [`perUser.${id}`, '']),
            }
          },
        )
          .session(session);

        stats.caseStatisticsUsersRemoved = result.nModified;

        if (result.nModified > usersIdsToRemove.length) {
          throw new Error(`CaseStatistics perUser remove modify ${result.nModified} records(should be equal or less than ${usersIdsToRemove.length})`);
        }

        result = await Case.updateMany(
          {
            creator: {
              $in: usersIdsToRemove,
            },
          },
          {
            $set: {
              creator: freshUser.id,
            },
          },
        )
          .session(session);

        stats.casesMerged = result.nModified;

        result = await Message.deleteMany({
          sender: {
            $in: usersIdsToRemove,
          },
        })
          .session(session);

        stats.messagesRemoved = result.deletedCount;

        result = await Room.updateMany(
          {
            participants: {
              $elemMatch: {
                $in: usersIdsToRemove,
              },
            },
          },
          {
            $pullAll: {
              participants: usersIdsToRemove,
            },
          },
        )
          .session(session);

        stats.roomsChanged = result.nModified;

        result = await Transaction.updateMany(
          {
            user: {
              $in: usersIdsToRemove,
            },
          },
          {
            $set: {
              user: freshUser.id,
            },
          },
        )
          .session(session);

        stats.transactionsMerged = result.nModified;

        result = await Upgrade.updateMany(
          {
            user: {
              $in: usersIdsToRemove,
            },
          },
          {
            $set: {
              user: freshUser.id,
            },
          },
        )
          .session(session);

        stats.upgradesMerged = result.nModified;
        
        result = await UserItem.updateMany(
          {
            user: {
              $in: usersIdsToRemove,
            },
          },
          {
            $set: {
              user: freshUser.id,
            },
          },
        )
          .session(session);

        stats.userItemsMerged = result.nModified;

        result = await UserStatistics.deleteMany({
          user: {
            $in: usersIdsToRemove,
          },
        })
          .session(session);

        stats.userStatisticsRemoved = result.deletedCount;

        if (result.deletedCount > usersIdsToRemove.length) {
          throw new Error(`UserStatistics user remove delete ${result.deletedCount} records(should be equal or less than ${usersIdsToRemove.length}`);
        }

        result = await User.deleteMany({
          _id: {
            $in: usersIdsToRemove,
          },
        })
          .session(session);

        stats.deleted = result.deletedCount;

        if (result.deletedCount !== usersIdsToRemove.length) {
          throw new Error(`User remove operation delete ${result.deletedCount} records(should be ${usersIdsToRemove.length})`);
        }

        stats.merged = users.length;
      });

      await session.endSession();

      console.log(`Successfuly merged ${stats.deleted} accounts into ${stats.freshUserId} user, stats:`, stats);

      accountsMerged += stats.merged;
      accountsDeleted += stats.deleted;
    } catch (err) {
      console.error(`Error while merging records with email ${email}, skip`, err);
      continue;
    }
  }

  console.log(`Done. Accounts touched: ${accountsMerged}; Accounts deleted: ${accountsDeleted}`);

  mongoose.disconnect();
})();


async function connectToMongo() {
  try {
    console.log(`Establishing mongodb connection...`);

    let dbUrl = config.db.url;
    let options = {
      useCreateIndex: true,
      useNewUrlParser: true,
      useFindAndModify: false
    };

    if (!dbUrl) {
      dbUrl = `mongodb://${config.db.user}:${config.db.pass}@${config.db.host}:${config.db.port}/${config.db.name}`;
    }

    if (config.db.user && config.db.pass && !config.db.url) {
      options["user"] = config.db.user;
      options["pass"] = config.db.pass;
      options["dbName"] = config.db.name;
    }

    await mongoose.connect(dbUrl, options);
    mongoose.set({ debug: true });
    console.log(`Mongodb connection established`);
  } catch (error) {
    console.error(`Mongodb connection error = ${error}`);
  }
}

