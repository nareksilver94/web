const mongoose = require("mongoose");
const { pick, omit } = require("lodash");
const User = require("../../models/user");
const Case = require("../../models/case");
const Battle = require("../../models/battle");
const ProvablyFair = require('../probably-fair');
const { battleStatuses } = require("../../constants");
const config = require("../../../config");
const { cancelBattle } = require("./delete");
const { errorMaker } = require("../../helpers");
const globalEvent = require('../event');
const logger = require('../logger');
const MODULE_NAME = 'BATTLE';


/**
 *  Creates a battle
 *
 *  @param { String } userId               user id
 *  @param { Array }  cases                case payload
 *  @param { String } cases.case           case id
 *  @param { Number } cases.count          case count
 *  @param { Number } userCount            number of players
 *  @param { String } seed                 client seed
 *  @param { Boolean } private             true if battle is private
 *
 *  @return { Object } battle object
 */

const createBattle = async ({ userId, seed, cases, userCount, private, translate }) => {
  const session = await mongoose.startSession();

  try {
    let resp, eventsToEmit;

    await session.withTransaction(async () => {
      eventsToEmit = [];

      const user = await User.findById(userId).session(session);

      if (!user) {
        throw errorMaker('BAD_REQUEST', translate('user.userNotFound'))
      }

      const caseIds = cases.map(v => mongoose.Types.ObjectId(v.case));
      const caseObjs = await Case.find({
        _id: { $in: caseIds },
        isDisabled: { $ne: true }
      })
        .select('price name image')
        .lean();

      if (caseObjs.length !== cases.length) {
        throw errorMaker('BAD_REQUEST', translate('battle.caseArrayInvalid'));
      }

      // create case array with count
      let totalRounds = 0;
      const price = cases.reduce(
        (total, acc) => {
          const caseEntry = caseObjs.find(v => v._id.equals(acc.case));
          if (!caseEntry) {
            return total;
          }

          totalRounds += acc.count;

          return total + caseEntry.price * acc.count;
        },
        0
      );

      if (user.balance < price) {
        throw errorMaker('BAD_REQUEST', translate('battle.enoughBalance'))
      }

      user.balance -= price;
      await user.save();

      // create dice for the battle
      const [dice] = await ProvablyFair.createDices([seed], session);

      const battlePayload = {
        cases,
        totalRounds,
        price,
        creator: userId,
        userCount,
        private,
        dice: dice._id,
        sessions: [
          {
            user: userId,
            seed,
            rounds: []
          }
        ]
      };

      let [result] = await Battle.create([battlePayload], { session });
      result = result.toObject();

      result.sessions[0].user = pick(user.toObject(), ['_id', 'username', 'profileImageUrl'])
      result.cases.forEach(c => {
        c.case = caseObjs.find(v => v._id.equals(c.case));
      });
      result.dice = dice;

      // format for battle list
      const eventBattle = omit(result, ['dice', 'updatedAt']);
      eventBattle.cases = eventBattle.cases.map(({ count, case: c }) => ({
        count,
        name: c.name,
        image: c.image
      }));
      eventBattle.sessions = eventBattle.sessions.map(({ user, ready }) => ({
        ready,
        ...user
      }));

      eventsToEmit.push(
        ['socket.emit', {
          eventName: 'user.balance',
          userId,
          message: '',
          balance: user.balance
        }],
        ['socket.emit', {
          eventName: 'battle.new',
          message: '',
          battle: eventBattle
        }],
        ['socket.room.join', {
          roomName: `battle_${result._id}`,
          userId
        }]
      );

      resp = result;
    });

    for (const [eventName, args] of eventsToEmit) {
      globalEvent.emit(eventName, args);
    }

    expireCheck({ id: resp._id, userId, translate });

    return resp;
  } catch (err) {
    throw err;
  } finally {
    session.endSession();
  }
};


/**
 *  Check battle expiration - better to do it in multi threads to improve performance instead of having it in cron job
 *
 *  @param { String }      id             battle id
 *  @param { String }      userId         creator id
 *  @param { Function }    translate      translate function with locale set
 *
 *  @return
 */

const expireCheck = ({ id, userId, translate }) => {
  const timerId = setTimeout(async () => {
    try {
      await cancelBattle({ id, userId, translate });
    } catch (error) {
      // something to do if battle cancel fails
    } finally {
      clearTimeout(timerId);
    }
  }, config.app.battleExpireTime);
}

module.exports = {
  createBattle
};
