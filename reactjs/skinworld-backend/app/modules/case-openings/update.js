const mongoose = require("mongoose");
const { omit } = require("lodash");
const Case = require("../../models/case");
const CaseOpening = require("../../models/case-opening");
const UserItem = require("../../models/user-item");
const User = require("../../models/user");
const Transaction = require("../../models/transaction");
const RewardCode = require("../../models/rewardcode");
const ProvablyFair = require("../probably-fair");
const statistics = require("../statistics");
const { errorMaker, statusCodes } = require("../../helpers");
const {
  caseTypes,
  transactionStatuses,
  transactionTypes,
  userTypes,
  rewardCodeTypes,
} = require("../../constants");
const redis = require("../redis");
const globalEvent = require("../event");

const INFLUENCER_TYPES = Object.values(userTypes).filter(
  v => v.startsWith(userTypes.Influencer)
);


/**
 * Roll opened case - it is for a battle when there is battle field provided
 *
 *  @param { String }             id             case opening id
 *  @param { String }             userId         opener id
 *  @param { Boolean }            testing        true if this is used for testing
 *  @param { String }             battle         battle id - undefined if normal case opening
 *  @param { String }             complete       true if dice session is completed
 *  @param { Function }           translate      translate function with locale set
 *  @param { MongooseSession }    session        session object from outside
 *
 *  @return { Object }     { rollInfo, winItemInfo }
 */

const rollCaseOpening = async ({ id, userId, testing, battle, complete, translate, session: _session }) => {
  let resp, eventsToEmit, session;

  try {
   const sessionHandler = (session) => async () => {
      eventsToEmit = [];

      const user = await getUser({ userId, session, translate });
      const caseOpening = await getCaseOpening({ id, userId, session, translate });
      const caseResult = await getCase({ caseId: caseOpening.case, session, translate });

      const totalPrice = await updateCaseAndUserForOpening({
        caseResult,
        caseOpening,
        user,
        eventsToEmit,
        battle,
        session,
        translate
      });

      const rangeMapping = getRangeMapping(caseResult);

      const { result, winningsInMoney } = await getWinItems({
        caseResult,
        caseOpening,
        user,
        rangeMapping,
        battle,
        complete,
        testing,
        session,
        translate
      });

      if (user.type === userTypes.USER) {
        // just add user statistics only

        const profit = totalPrice - winningsInMoney;

        await updateStatistics({
          profit,
          userId,
          caseId: caseOpening.case,
          caseCount: caseOpening.dices.length,
          caseName: caseResult.name,
          eventsToEmit,
          session,
          testing
        });
      }

      resp = result;
    }

    if (_session) {
      await sessionHandler(_session)();
    } else {
      session = await mongoose.startSession();
      await session.withTransaction(sessionHandler(session));
    }

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }

    return resp;
  } catch (err) {
    throw err;
  } finally {
    if (!_session && session) {
      session.endSession();
    }
  }
};

const updateServerHash = async (diceId, translate) => {
  return await ProvablyFair.changeServerHash(diceId, translate);
};

const updateClientSeed = async (caseOpeningId, clientSeed, translate) => {
  const caseOpening = await CaseOpening.findById(caseOpeningId);
  if (!caseOpening) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.unboxingNotExist'));
  }

  for (let i = 0; i < caseOpening.dices.length; i++) {
    await ProvablyFair.changeClientSeed(caseOpening.dices[i], clientSeed, translate);
  }

  return true;
};


/**
 *  Check case opening and get instance
 */

const getCaseOpening = async ({ id, userId, session, translate }) => {
  const caseOpening = await CaseOpening.findById(id)
    .session(session);

  if (!caseOpening) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.unboxingNotExist'));
  }
  if (!caseOpening.user.equals(userId)) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('global.accessDenied'));
  }

  caseOpening.winItems = [];

  return caseOpening;
}


/**
 *  Check case and get instance
 */

const getCase = async ({ caseId, session, translate }) => {
  const caseResult = await Case.findById(caseId)
    .populate({
      path: "items",
      populate: {
        path: "item",
        model: "site-items",
        select: "_id value type color image name tag"
      }
    })
    .session(session);

  if (caseResult.isDisabled === true) {
    // case became disabled, delete case opening
    // await CaseOpening.deleteOne({ _id: id });

    throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.caseDisabled'));
  }

  return caseResult;
}


/**
 *  Check user and get instance
 */

const getUser = async ({ userId, session, translate }) => {
  const user = await User.findById(userId).session(session);
  if (!user) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('user.userNotExist'));
  }

  return user;
}


/**
 *  Check if user can open freebox - just skip if user is admin
 */

const freeboxCheck = async ({ caseOpening, user, translate }) => {
  if (user.type === userTypes.Admin) {
    return;
  }

  if (caseOpening.dices.length > 1) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.openMultiFreeBox'));
  }

  let hasFreeboxOpened = user.hasFreeboxOpened;
  const ips = user.ip.split(', ');

  if (!hasFreeboxOpened) {
    // check based on ip
    for (ip of ips) {
      const ipKey = redis.getKey('IP_PREFIX', ip);
      const fboxOpened = await redis.hgetAsync(ipKey, 'fboxOpened');
      hasFreeboxOpened = !!fboxOpened;

      if (hasFreeboxOpened) {
        break;
      }
    }
  }

  if (hasFreeboxOpened) {
    // spam account on different ip, update his freebox track
    if (!user.hasFreeboxOpened) {
      // not using session based object to avoid transaction abortion
      await User.updateOne(
        { _id: user._id },
        { $set: { hasFreeboxOpened: true } }
      );
      throw errorMaker(statusCodes.BAD_REQUEST, translate('user.multiAccountsNotAllowed'));
    } else {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.notExitFreeBox'));
    }
  } else {
    // pass
    user.hasFreeboxOpened = true;
    ips.forEach(ip => {
      const ipKey = redis.getKey('IP_PREFIX', ip);
      redis.hmset(ipKey, { fboxOpened: true });
    });
  }
}

/**
 *  Update case owner's earning on unboxing
 *
 *  @params { String } user               opener
 *  @params { Case }   caseResult         case object
 *  @params { Number } totalPrice         case total price (calculated by count)
 *  @params { Array }  eventsToEmit       events array to emit
 */

const updateCaseOwnerEarnings = async ({ user, caseResult, totalPrice, eventsToEmit, session }) => {
  // case earning update
  const earnedPoints = Number(((totalPrice * caseResult.affiliateCut) / 100).toFixed(2));
  caseResult.earning += earnedPoints;

  const creator = await User.updateOne(
    { _id: caseResult.creator },
    { $inc: { caseEarnings: earnedPoints } }
  ).session(session);

  eventsToEmit.push(["socket.emit", {
    eventName: "case.opened",
    opennerId: user._id,
    userId: caseResult.creator,
    caseId: caseResult._id,
    availableEarnings: creator.caseEarnings,
    message: `
      User "${user.username}"" has opened your Box "${caseResult.name}"
      and $${earnedPoints} has been added to your balance.
    `
  }]);
}


/**
 *  Update case statistics and user balances 
 */

const updateCaseAndUserForOpening = async ({
  caseResult,
  caseOpening,
  user,
  eventsToEmit,
  battle,
  session,
  translate
}) => {
  const totalPrice = caseResult.price * caseOpening.dices.length;
  const isDailyCase = caseResult.caseTypes.indexOf(caseTypes.DAILY) !== -1;

  if (isDailyCase) {
    if (
      user.lastDailyCaseOpened &&
      user.lastDailyCaseOpened.getTime() + 24 * 60 * 60 * 1000 > Date.now()
    ) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.openDailyTwice'));
    }

    const [grouped] = await Transaction.aggregate([
      {
        $match: {
          user: user._id,
          transactionType: transactionTypes.Deposit,
          status: transactionStatuses.Completed
        }
      },
      { $group: { _id: null, total: { $sum: "$value" } } }
    ]);

    if (!grouped || grouped.total < 5) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.requireDeposiedAmount'));
    }

    user.lastDailyCaseOpened = Date.now();

    // case unbox count update
    caseResult.unboxCounts++;
  }
  else {
    if (caseResult.caseTypes.includes(caseTypes.FREE)) {
      await freeboxCheck({ caseOpening, user, translate });
    }
    else if (user.balance < totalPrice) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.enoughBalance'));
    }
    else {
      // don't modify balance if that's battle mode
      if (!battle) {
        // user balance update
        user.balance -= totalPrice;

        // emit socket event
        eventsToEmit.push(["socket.emit", {
          eventName: "user.balance",
          userId: user._id,
          message: "",
          balance: user.balance
        }]);
      }

      // case owner earning update (only update when open other user's case)
      if (!caseResult.creator.equals(user._id)) {
        await updateCaseOwnerEarnings({ user, caseResult, totalPrice, eventsToEmit, session });
      }
    }

    user.unboxedCases += 1;

    // case unbox count update
    caseResult.unboxCounts += caseOpening.dices.length;
  }

  await caseResult.save();
  await user.save();

  return totalPrice;
}


/**
 *  Get item range mapping
 */

const getRangeMapping = (caseResult) => {
  // get range mapping
  let totalOdd = 0;
  const rangeMapping = [];
  let borderRangeStart = 0;     // used to determine high price item mapping entries

  caseResult.items.sort((a, b) => a.item.value - b.item.value);

  for (let i = 0; i < caseResult.items.length; i++) {
    const item = caseResult.items[i];
    rangeMapping.push({
      ...item.toObject(),
      rangeStart: totalOdd !== 0 ? totalOdd + 0.01 : 0,
      rangeEnd: totalOdd + item.odd,
      index: i
    });

    // save the border index
    if (borderRangeStart === 0 && item.item.value > caseResult.price) {
      borderRangeStart = totalOdd;
    }

    totalOdd = totalOdd + item.odd;
  }

  return rangeMapping;
}


/**
 *  Get win items
 */

const getWinItems = async ({
  caseResult,
  caseOpening,
  user,
  rangeMapping,
  battle,
  complete,
  testing,
  session,
  translate
}) => {
  let winningsInMoney = 0;
  let forceValue = null;

  // get high price item for influencer
  if (INFLUENCER_TYPES.indexOf(user.type) !== -1
    && caseResult.oddRange && caseResult.oddRange[user.type]
    && caseResult.oddRange[user.type].length > 0
  ) {
    // check if this influencer opened this box already
    const openedCount = await CaseOpening
      .find({ case: caseResult._id, user: caseOpening.user })
      .countDocuments();

    if (openedCount <= 1) {
      let cumulativeOdds = 0; // 0 ~ 100
      let temp = null; // price range info for candidate
      let randomNum = Math.random();

      caseResult.oddRange[user.type].forEach(range => {
        if (!range.odd) {
          return;
        }
        // if odd range is configured
        if (!temp && (range.odd / 100) + cumulativeOdds > randomNum) {
          temp = range;
        }
        cumulativeOdds += range.odd;
      });

      // odd range is not configured fully, assume the rest (current ~ 100) is selectable
      const needToSelectRest = !temp && cumulativeOdds < 100;
      const candidateValues = [];
      const restValues = [];

      rangeMapping.forEach(range => {
        if (forceValue) {
          return;
        }
        if (temp && temp.start <= range.item.value && range.item.value < temp.end) {
          candidateValues.push(range.rangeStart);
        } else {
          restValues.push(range.rangeStart);
        }
      });

      if (needToSelectRest) {
        forceValue = restValues[Math.floor(restValues.length * Math.random())];
      } else {
        forceValue = candidateValues[Math.floor(candidateValues.length * Math.random())];
      }
    }
  }

  const rollInfo = await ProvablyFair.rollResult(
    caseOpening.dice,
    session,
    caseOpening.nonces,
    complete,
    translate
  );

  const userItemPayload = [];
  const winItemInfo = rollInfo.values.map((value, i) => {
    let temp = value;
    if (i === 0) {
      temp = forceValue || value;
    }

    const _info = rangeMapping.find(
      v => v.rangeStart <= temp && temp <= v.rangeEnd
    );
    const info = { ..._info };

    userItemPayload.push({
      user: user._id,
      item: info._id,
      battle,
      testing
    });
    caseOpening.winItems.push(info._id);

    winningsInMoney += info.value;

    return info;
  });

  await caseOpening.save();

  const userItems = await UserItem.insertMany(userItemPayload, { session });

  winItemInfo.forEach((v, i) => {
    v.userItem = { _id: userItems[i]._id };
  });
  const result = {
    rollInfo: {
      ...rollInfo,
      nonces: caseOpening.nonces
    },
    winItemInfo
  };

  return { result, winningsInMoney };
}


/**
 *  Update statistics after the roll
 */

const updateStatistics = async ({
  profit,
  userId,
  caseId,
  caseCount,
  caseName,
  eventsToEmit,
  session,
  testing
}) => {
  // update profits
  await Case.updateOne(
    { _id: caseId },
    { $inc: { profit } }
  ).session(session);

  // update statistics
  await statistics.cases.addCaseOpening(
    caseId,
    userId,
    caseCount,
    session,
    testing,
  );

  // tracking
  eventsToEmit.push(["socket.emit", {
    eventName: "ga",
    isSingle: true,
    userId,
    event: 'Unbox',
    numberOfBoxes: caseCount,
    boxname: caseName
  }]);
}


module.exports = {
  rollCaseOpening,
  updateServerHash,
  updateClientSeed
};
