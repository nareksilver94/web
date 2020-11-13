const mongoose = require("mongoose");
const { pick, omit, groupBy, uniqWith, isEqualWith } = require("lodash");
const User = require("../../models/user");
const CaseOpening = require("../../models/case-opening");
const Case = require("../../models/case");
const ProvablyFair = require("../probably-fair");
const { statusCodes, errorMaker } = require("../../helpers");


/**
 *  Creates a case opening
 *
 *  @param { Array } payload               array of case opening payload
 *  @param { String } payload.user         case opener
 *  @param { String } payload.caseId       case id
 *  @param { String } payload.count        case count
 *  @param { String } payload.seed         client seed
 *  @param { String } payload.dice         external dice id, optional
 *  @param { Array } payload.nonces        dice nonces for the case opening, optional - [0]
 *  @param { Boolean } testing             is creating test record
 *  @param { Function } translate          tranlate function with locale set
 *
 *  @return { Object }
 */

const openCase = async ({ payload, testing, translate, session: _session }) => {
  let session;
  let resp;

  try {
    const sessionHandler = (session) => async () => {
      // check user exists
      const userIds = uniqWith(
        payload.map(v => mongoose.Types.ObjectId(v.user)),
        (a, b) => a.equals(b)
      );
      const userCount = await User.find(
        {
          _id: { $in: userIds }
        }
      ).countDocuments();

      if (userCount !== userIds.length) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('user.userNotExist'));
      }

      // check case exists
      const caseIds = uniqWith(
        payload.map(v => mongoose.Types.ObjectId(v.caseId)),
        (a, b) => a.equals(b)
      );
      const caseCount = await Case.find(
        {
          _id: { $in: caseIds },
          isDisabled: { $ne: true }
        }
      ).countDocuments();

      if (caseCount !== caseIds.length) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('cases.caseNotExist'));
      }

      // create dices for the ones which have no external dice
      const seedArray = payload.filter(v => !v.dice)
        .map(v => v.seed);
      let diceResult = []

      if (seedArray.length) {
        diceResult = await ProvablyFair.createDices(seedArray, session, testing);
      }

      // take the right dice for each payload
      const caseOpeningPayload = [];
      const dicesUsed = [];

      payload.forEach(v => {
        let dice;
        let nonces = [0];

        if (v.dice) {
          dice = v.dice;
          nonces = v.nonces;
        } else {
          const diceIndex = diceResult.findIndex(
            (d, i) => d.clientSeed === v.seed && !dicesUsed.includes(i)
          );

          dice = diceResult[diceIndex]._id;
          dicesUsed.push(diceIndex);

          nonces = Array(v.count).fill().map((_, i) => i)
        }

        caseOpeningPayload.push({
          case: v.caseId,
          user: v.user,
          dice,
          nonces,
          testing,
        });
      });
      const result = await CaseOpening.insertMany(caseOpeningPayload, { session });

      // get relevant dice info
      resp = result.map(co => {
        const temp = omit(co.toObject(), ['createdAt', 'updatedAt']);
        temp.dice = diceResult.find(d => co.dice.equals(d._id));

        return temp;
      });
    }

    if (_session) {
      await sessionHandler(_session)();
    } else {
      session = await mongoose.startSession();
      await session.withTransaction(sessionHandler(session));
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

module.exports = {
  openCase
};
