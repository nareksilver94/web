const mongoose = require("mongoose");
const Case = require("../../models/case");
const Battle = require("../../models/battle");
const ProvablyFair = require("../probably-fair");
const { battleStatuses } = require("../../constants");
const { errorMaker } = require("../../helpers");
const globalEvent = require('../event');


/**
 *  Creates a battle
 *
 *  @param { String }   id              battle id
 *  @param { Function } translate       translate function locale set
 *
 *  @return { Object } battle object
 */

const getBattle = async (id, userId, translate) => {
  try {
    const battle = await Battle.findById(id)
      .populate([
        {
          path: 'winner',
          select: 'username profileImageUrl'
        },
        {
          path: 'dice',
          select: 'seed clientSeed seedHash'
        },
        {
          path: 'sessions.user',
          select: 'username profileImageUrl'
        },
        {
          path: 'sessions.rounds.opening',
          select: 'winItems',
          populate: [
            {
              path: 'winItems',
              select: 'name image value color'
            }
          ]
        }
      ])
      .select('-updatedAt')
      .lean();

    if (!battle) {
      throw errorMaker('BAD_REQUEST', translate('battle.notExists'))
    }
    if (
      battle.status === battleStatuses.Pending ||
      battle.status === battleStatuses.Running
    ) {
      // throw errorMaker('BAD_REQUEST', translate('battle.not_completed'))
      delete battle.dice.seed;
    } else if (battle.status === battleStatuses.Completed) {
      battle.dice.rollValue = ProvablyFair.calculate(battle.dice.seed, battle.dice.clientSeed, 0);
    }

    let totalCaseCount = 0;
    const { case: caseId } = battle.cases.find(c => {
      if (totalCaseCount <= battle.currentRound && battle.currentRound < totalCaseCount + c.count) {
        return true;
      }

      totalCaseCount += c.count;
    });

    if (caseId) {
      battle.case = await Case.findById(caseId)
        .select('name price image')
        .lean();
    }

    // sanitizing
    battle.sessions = battle.sessions.map(({ user, seed, winning, rounds: _rounds }) => {
      const rounds = _rounds.map(({ opening, index }) => ({
        item: opening.winItems[0],
        index
      }))
      .filter(r => r.index <= battle.currentRound);

      return {
        user,
        seed,
        rounds,
        winning
      }
    });

    // leave other battle rooms - user just watch one room at a time.
    globalEvent.emit('socket.room.leave', {
      userId,
      roomName: /battle_/
    });

    // join to room - assume get battle api is called when user visits detail page.
    globalEvent.emit('socket.room.join', {
      userId,
      roomName: `battle_${battle._id}`
    });

    return battle;
  } catch (err) {
    throw err;
  }
};


/**
 *  Return all public battles
 */

const getBattles = async (userId, type = 'list') => {
  try {
    let query;
    if (type === 'mine') {
      query = {
        $or: [
          { 'sessions.user': mongoose.Types.ObjectId(userId) },
          { 'creator': mongoose.Types.ObjectId(userId) }
        ]
      };
    }
    if (type === 'history') {
      query = {
        status: battleStatuses.Completed
      };
    }
    if (type === 'list') {
      query = {
        status: { $in: [battleStatuses.Pending, battleStatuses.Running] },
        private: { $ne: true }
      };
    }

    const battles = await Battle.find(query)
      .populate([
        {
          path: 'winner',
          select: 'username profileImageUrl'
        },
        {
          path: 'sessions.user',
          select: 'username profileImageUrl'
        },
        {
          path: 'cases.case',
          select: 'name image'
        }
      ])
      .select('-updatedAt -sessions.rounds -sessions.seed -dice')
      .sort('-createdAt')
      .limit(100)
      .lean();

    for (let battle of battles) {
      battle.cases = battle.cases.map(({ count, case: c }) => ({
        count,
        name: c.name,
        image: c.image
      }));

      battle.sessions = battle.sessions.map(({ user, ready }) => ({
        ready,
        ...user
      }));
    }

    return battles;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getBattle,
  getBattles
};
