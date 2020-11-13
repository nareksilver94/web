const mongoose = require("mongoose");
const User = require("../../models/user");
const Battle = require("../../models/battle");
const Dice = require("../../models/dice");
const CaseOpening = require("../../models/case-opening");
const { battleStatuses } = require("../../constants");
const { errorMaker } = require("../../helpers");
const globalEvent = require('../event');
const logger = require('../logger');
const MODULE_NAME = 'BATTLE';


/**
 *  Cancel a battle
 *
 *  @param { String }   id              battle id to cancel
 *  @param { String }   userId          canceler id
 *  @param { Function } translate       translate function locale set
 *  @param { Boolean }  forceCancel     just cancel it - internal usage
 *
 *  @return
 */

const cancelBattle = async ({ id, userId, translate, forceCancel = true }) => {
  const session = await mongoose.startSession();

  try {
    let resp, logs;
    let eventsToEmit;

    await session.withTransaction(async () => {
      logs = [];
      eventsToEmit = [];

      const user = await User.findById(userId).session(session);
      if (!user) {
        throw errorMaker('BAD_REQUEST', translate('user.userNotFound'));
      }

      const battle = await Battle.findById(id).session(session);
      if (!battle) {
        throw errorMaker('BAD_REQUEST', translate('battle.notExists'));
      }

      if (!forceCancel) {
        if (battle.status !== battleStatuses.Pending) {
          throw errorMaker('BAD_REQUEST', translate('battle.startedOrCompleted'));
        }
        if (!battle.creator.equals(userId)) {
          throw errorMaker('BAD_REQUEST', translate('battle.notOwner'))
        }
      }

      // remove all case openings
      const coIds = battle.sessions.reduce((t, s) =>
        t.concat(s.rounds.map(v => v.opening)),
        []
      );
      const diceIds = await CaseOpening.distinct('dices', { _id: { $in: coIds } });
      const ddResult = await Dice.deleteMany({ _id: { $in: diceIds } });
      const codResult = await CaseOpening.deleteMany({ _id: { $in: coIds } });

      if (ddResult.deletedCount !== diceIds.length) {
        logs.push([
          'error',
          'Remove dices failed',
          {
            MODULE_NAME,
            actual: ddResult.nRemove,
            expected: diceIds.length,
          }
        ]);
      }
      if (codResult.deletedCount !== coIds.length) {
        logs.push([
          'error',
          'Remove case opening failed',
          {
            MODULE_NAME,
            actual: codResult.nRemove,
            expected: coIds.length
          }
        ]);
      }

      battle.sessions.forEach(s => s.rounds = []);
      battle.currentRound = 0;

      // remove dice created
      await Dice.findByIdAndRemove(battle.dice);

      // refund user balances
      const playerIds = battle.sessions.map(s => s.user);
      await User.updateMany(
        { _id: { $in: playerIds } },
        {
          $inc: {
            balance: battle.price,
          }
        }
      ).session(session);

      user.balance += battle.price;
      await user.save();

      // set battle status
      battle.status = battleStatuses.Cancelled;
      await battle.save();

      // notify users with their balance and emit battle.cancel event
      const usersToNotify = await User.find({ _id: { $in: [...playerIds, userId] } })
        .select('balance')
        .session(session)
        .lean();
      eventsToEmit = usersToNotify.reduce(
        (total, player) => total.concat(
          ['socket.emit', {
            eventName: 'user.balance',
            userId: player._id,
            message: '',
            balance: player.balance
          }],
          ['socket.room.leave', {
            roomName: `battle_${id}`,
            userId: player._id
          }]
        ),
        []
      );
      eventsToEmit.push(
        ['socket.emit', {
          eventName: 'battle.cancel',
          message: translate('battle.cancelled'),
          battle: id
        }]
      );
    });

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }

    for (const [action, ...args] of logs) {
      logger[action](...args);
    }

    return resp;
  } catch (err) {
    throw err;
  } finally {
    session.endSession();
  }
};

module.exports = {
  cancelBattle
};
