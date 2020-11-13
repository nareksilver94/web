const mongoose = require('mongoose');
const { pick, maxBy } = require('lodash');
const User = require('../../models/user');
const UserItem = require('../../models/user-item');
const Case = require('../../models/case');
const Battle = require("../../models/battle");
const { battleStatuses } = require("../../constants");
const { errorMaker } = require("../../helpers");
const globalEvent = require('../event');
const CaseOpeningModule = require('../case-openings');
const ProvablyFair = require('../probably-fair');
const { cancelBattle } = require('./delete');
const logger = require('../logger');
const MODULE_NAME = 'BATTLE';


const battleAllowedFields = ['currentRound', 'creator', 'totalWinning', 'status', 'dice', '_id'];


/**
 *  Join a battle
 *
 *  @param { String }   id              battle id
 *  @param { String }   userId          user id to join
 *  @param { String }   seed            client seed
 *  @param { Function } translate       translate function locale set
 *
 *  @return { Object }
 */

const joinBattle = async ({ id, userId, seed, translate }) => {
  const session = await mongoose.startSession();

  try {
    let resp, eventsToEmit;

    await session.withTransaction(async () => {
      eventsToEmit = [];

      const user = await User.findById(userId).session(session);
      if (!user) {
        throw errorMaker('BAD_REQUEST', translate('user.userNotFound'));
      }

      const battle = await Battle.findById(id).session(session);
      if (!battle) {
        throw errorMaker('BAD_REQUEST', translate('battle.notExists'))
      }

      if (battle.status !== battleStatuses.Pending) {
        throw errorMaker('BAD_REQUEST', translate('battle.startedOrCompleted'))
      }
      if (battle.sessions.length === battle.userCount) {
        throw errorMaker('BAD_REQUEST', translate('battle.noSeat'))
      }
      if (user.balance < battle.price) {
        throw errorMaker('BAD_REQUEST', 'battle.enoughBalance');
      }

      // check if user is already joined or the owner
      const sameSession = battle.sessions.find(s => s.user.equals(userId));
      if (sameSession || battle.creator.equals(userId)) {
        throw errorMaker('BAD_REQUEST', translate('battle.alreadyJoined'))
      }

      user.balance -= battle.price;
      await user.save();

      battle.sessions.push({ user: userId, seed });
      await battle.save();

      // update client seed
      const battleSeed = battle.sessions.reduce((seed, s) => `${seed}_${s.seed}`, '');
      await ProvablyFair.changeClientSeed(battle.dice, battleSeed, translate);

      resp = battle.toObject();

      // starts battle if condition meets
      if (isReady(battle)) {
        resp = await startBattle({ battle, session, eventsToEmit, translate });
      }

      eventsToEmit.push(
        ['socket.emit', {
          eventName: 'user.balance',
          userId,
          message: '',
          balance: user.balance
        }],
        ['socket.emit', {
          eventName: 'battle.user.join',
          user: pick(user.toObject(), ['_id', 'username', 'profileImageUrl']),
          seed,
          battle: pick(resp, battleAllowedFields),
          message: '',
        }]
      );
    });

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }

    return resp;
  } catch (err) {
    throw err;
  } finally {
    session.endSession();
  }
};


/**
 *  Quit a battle
 *
 *  @param { String }   id              battle id
 *  @param { String }   userId          user id to quit
 *  @param { Function } translate       translate function locale set
 *
 *  @return { Object }
 */

const quitBattle = async ({ id, userId, translate }) => {
  const session = await mongoose.startSession();

  try {
    let resp, eventsToEmit;

    await session.withTransaction(async () => {
      eventsToEmit = [];

      const user = await User.findById(userId).session(session);
      if (!user) {
        throw errorMaker('BAD_REQUEST', translate('user.userNotFound'));
      }

      const battle = await Battle.findById(id).session(session);
      if (!battle) {
        throw errorMaker('BAD_REQUEST', translate('battle.notExists'))
      }
      if (battle.status !== battleStatuses.Pending) {
        throw errorMaker('BAD_REQUEST', translate('battle.startedOrCompleted'))
      }

      const sessionIndex = battle.sessions.findIndex(s => s.user.equals(userId));      
      if (sessionIndex === -1) {
        throw errorMaker('BAD_REQUEST', translate('battle.userNotJoined'))
      }

      // refund
      user.balance += battle.price;
      await user.save();

      battle.sessions.splice(sessionIndex, 1);
      battle.markModified('sessions');
      await battle.save();

      resp = battle.toObject();

      eventsToEmit.push(
        ['socket.emit', {
          eventName: 'user.balance',
          userId,
          message: '',
          balance: user.balance
        }],
        ['socket.emit', {
          eventName: 'battle.user.leave',
          user: user._id,
          battle: pick(resp, battleAllowedFields),
          message: '',
        }]
      );
    });

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }

    return resp;
  } catch (err) {
    throw err;
  } finally {
    session.endSession();
  }
};


/**
 *  Set ready for a battle
 *
 *  @param { String }   id              battle id
 *  @param { String }   userId          user id to join
 *  @param { Function } translate       translate function locale set
 *
 *  @return { Object } battle object
 */

const setReadyForBattle = async ({ id, userId, translate }) => {
  const session = await mongoose.startSession();

  try {
    let resp, eventsToEmit;

    await session.withTransaction(async () => {
      eventsToEmit = [];

      const battle = await Battle.findById(id);
      if (!battle) {
        throw errorMaker('BAD_REQUEST', translate('battle.notExists'))
      }
      if (battle.status !== battleStatuses.Pending) {
        throw errorMaker('BAD_REQUEST', translate('battle.startedOrCompleted'))
      }

      const userSession = battle.sessions.find(s => s.user.equals(userId));
      if (!userSession) {
        throw errorMaker('BAD_REQUEST', translate('battle.notJoined'))
      }
      if (userSession.ready) {
        throw errorMaker('BAD_REQUEST', translate('battle.userReady')) 
      }

      userSession.ready = true;
      await battle.save();

      resp = battle.toObject();

      if (isReady(battle)) {
        resp = await startBattle({ battle, session, eventsToEmit, translate });
      }

      eventsToEmit.push(['socket.emit', {
        eventName: 'battle.user.ready',
        roomName: `battle_${id}`,
        message: '',
        user :userId,
        battle: pick(resp, battleAllowedFields)
      }]);
    });

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }

    logger.info('User ready for battle', { MODULE_NAME, battle: id });

    return resp;
  } catch (err) {
    throw err;
  } finally {
    session.endSession();
  }
};


/**
 *  Starts a battle
 *
 *  @param { String }   battle               battle instance
 *  @param { MongooseSession } session       session object
 *  @param { Function } translate            translate function locale set
 *
 *  @return { Object } battle object
 */

const startBattle = async ({ battle, session, eventsToEmit, translate }) => {
  try {
    let resp;

    // open cases - aligned by rounds
    const payload = [];
    const playerCount = battle.sessions.length;
    const { totalRounds } = battle;

    for (let i = 0; i < playerCount; i ++) {
      const s = battle.sessions[i];
      const nonces = Array(totalRounds).fill().map((_, n) => i + playerCount * n);

      for (const v of battle.cases) {
        payload.push({
          caseId: v.case,
          user: s.user,
          dice: battle.dice,
          nonces: nonces.splice(0, v.count)
        });
      }
    }

    const caseOpenings = await CaseOpeningModule.openCase({ payload, translate, session });

    for (const { case: caseId, count } of battle.cases) {
      for (const s of battle.sessions) {
        const coi = caseOpenings.findIndex(co =>
          s.user.equals(co.user) && caseId.equals(co.case)
        );

        if (coi === -1) {
          throw errorMaker('BAD_REQUEST', translate('battle.unboxingFailed'));
        }

        s.rounds = s.rounds || [];
        s.rounds.push({
          opening: caseOpenings[coi]._id,
          nonces: caseOpenings[coi].nonces 
        });

        // remove from total list
        caseOpenings.splice(coi, 1);
      }
    }

    battle.status = battleStatuses.Running;
    await battle.save();

    resp = battle.toObject();

    eventsToEmit.push(['socket.emit', {
      eventName: 'battle.start',
      message: '',
      battle: battle._id
    }]);

    logger.info('Battle started', { MODULE_NAME, battle: battle._id });

    // start background job (wait for session realease)
    setTimeout(() => {
      runBattleRound({ id: battle._id, totalRounds, translate });
    }, 1000);

    return resp;
  } catch (err) {
    throw err;
  }
};


/**
 *  Roll a battle round
 *
 *  @param { String }   id              battle id
 *  @param { String }   totalRounds     total rounds of battle
 *  @param { Function } translate       translate function locale set
 *
 *  @return { Object } battle object
 */

// TODO: consider wrap whole rounds - watchers may not get update
const runBattleRound = async ({ id, totalRounds, translate }) => {
  const ROUND_DELAY = 5 * 1000;

  let eventsToEmit, winInfo, roundInfo;
  let rIndex = 0;
  let subRIndex = 0;      // rIndex + subRIndex => current round cumulative index
  let creator = null;
  let roundInfoCache = [];

  try {
    while (rIndex < totalRounds) {
      const session = await mongoose.startSession();
      const isLastRound = rIndex === totalRounds - 1;

      // run a transaction for each round
      await session.withTransaction(async () => {
        eventsToEmit = [];

        const battle = await Battle.findById(id).session(session);
        creator = battle.creator;

        const rCache = [];
        const roundInfo = [];
        const playerCount = battle.sessions.length

        for (let sIndex = 0; sIndex < playerCount; sIndex ++) {
          const s = battle.sessions[sIndex];

          // roll a round just one time
          let round = roundInfoCache.find(
            v => v[sIndex].rollInfo.nonces.includes(rIndex * playerCount + sIndex)
          );
          let currentRoundInfo;

          if (!round) {
            // TODO: move fetching dice record code out of rollCaseOpening for performance
            round = s.rounds.find(v => v.nonces.includes(rIndex * playerCount + sIndex));

            const info = await CaseOpeningModule.rollCaseOpening({
              id: round.opening,
              userId: s.user,
              battle: battle._id,
              complete: isLastRound && sIndex === playerCount - 1,
              translate,
              session
            });

            // don't roll the same unboxing - just use it
            subRIndex = 0;

            rCache.push(info);
            currentRoundInfo = info;
          } else {
            // use cached info - for multiple unboxing
            currentRoundInfo = roundInfoCache[roundInfoCache.length - 1][sIndex];
          }

          s.winning += currentRoundInfo.winItemInfo[subRIndex].item.value;
          battle.totalWinning += currentRoundInfo.winItemInfo[subRIndex].item.value;

          // sending one win items per round
          const { values, ...otherRollInfo } = currentRoundInfo.rollInfo;
          roundInfo.push({
            rollInfo:{
              value: values[subRIndex],
              ...otherRollInfo
            },
            winItemInfo: currentRoundInfo.winItemInfo[subRIndex]
          });
        }

        if (rCache.length) {
          roundInfoCache.push(rCache);
        }

        battle.markModified('sessions');

        // last round - check winner and move all items to winner inventory
        if (isLastRound) {
          let winnerId;
          const isScoreEqual = battle.sessions.every(
            s => s.winning === battle.sessions[0].winning
          );
          let loserIds = [];

          if (isScoreEqual) {
            const step = 100 / battle.sessions.length;
            const randomValue = Math.random() * 100;

            battle.sessions.forEach((s, i) => {
              if (step * i <= randomValue && randomValue < step * (i + 1)) {
                winnerId = s.user;
              } else {
                loserIds.push(s.user);
              }
            });
          } else {
            const { user: _winnerId } = maxBy(battle.sessions, 'winning');
            winnerId = _winnerId;
            battle.sessions.forEach((s, i) => {
              if (!s.user.equals(winnerId)) {
                loserIds.push(s.user);
              }
            });
          }

          logger.info('Battle finished', { MODULE_NAME, winnerId, loserIds, battle: battle._id });

          await UserItem.updateMany(
            {
              battle: battle._id,
              user: { $in: loserIds },
            },
            { $set: { user: winnerId } }
          )
          .session(session);

          battle.status = battleStatuses.Completed;
          battle.winner = winnerId;
          winInfo = { winnerId };
        }

        battle.currentRound = rIndex;
        await battle.save();

        let acc = 0;
        const currentCase = battle.cases.find(c => {
          acc += c.count;
          if (rIndex < acc) {
            return true;
          }
        });
        const caseInfo = await Case.findById(currentCase.case)
          .populate({
            path: "items",
            populate: {
              path: "item",
              model: "site-items",
              select: "type color image name tag value"
            }
          })
          .select('name image slug price items')
          .session(session)
          .lean();

        eventsToEmit.push(
          ['socket.emit', {
            eventName: 'battle.round',
            roomName: `battle_${id}`,
            message: '',
            battle: pick(battle.toObject(), battleAllowedFields),
            round: roundInfo,
            case: caseInfo,
            winInfo
          }]
        );
      });

      await session.endSession();

      for (const [eventName, args] of eventsToEmit) {
        globalEvent.emit(eventName, args);
      }

      rIndex ++;
      subRIndex ++;

      // battle delay
      await new Promise(resolve => setTimeout(resolve, ROUND_DELAY));
    }

    globalEvent.emit('socket.emit', {
      eventName: 'battle.end',
      message: '',
      battle: id
    });
  } catch (error) {
    logger.error('Battle round failed', { MODULE_NAME, rIndex, battle: id, error });
    await cancelBattle({
      id,
      userId: creator,
      translate,
      forceCancel: true
    });
  }
}

/**
 *  Check battle is ready to start
 */

const isReady = (battle) => {
  const isAllReady = battle.sessions.every(s => !!s.ready);
  const isRoomFull = battle.sessions.length === battle.userCount;

  return battle.sessions.length > 1 && (isRoomFull || isAllReady);
}


module.exports = {
  joinBattle,
  quitBattle,
  setReadyForBattle,
};
