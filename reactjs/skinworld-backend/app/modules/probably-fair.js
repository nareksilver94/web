const mongoose = require("mongoose");
const crypto = require("crypto");
const { omit } = require("lodash");
const request = require("request-promise-native")
const shortId = require("short-id");
const config = require("../../config");
const Dice = require("../models/dice");
const Upgrade = require("../models/upgrade");
const CaseOpening = require("../models/case-opening");
const { errorMaker, statusCodes } = require("../helpers");
const { diceStatuses } = require("../constants");
const logger = require("./logger");
const MODULE_NAME = "PROVABLY_FAIR";
const { translate } = require('../i18n');

let seedList = [];
let seedUpdatePromise;

const unAllowedFields = ["seed", "status", "createdAt", "updatedAt"];

const getRandomSeed = async () => {
  if (seedList.length <= 100) {
    // few available seeds, need to update
    if (seedUpdatePromise === void 0) {
      // check if it's already updating
      seedUpdatePromise = _updateSeedList();
    }
  }

  if (seedList.length === 0) {
    // no seeds left, wait until update is finished
    await seedUpdatePromise;
  }

  const seed = seedList.pop();
  return seed;
};

const _updateSeedList = async (listLength = 200) => {
  // update local seed list
  try {
    const id = Date.now().toString();
    const resp = await request({
      method: 'POST',
      url: `https://api.random.org/json-rpc/2/invoke`,
      body: {
        jsonrpc: '2.0',
        method: 'generateSignedStrings',
        params: {
          apiKey: process.env.RANDOM_ORG_API_KEY,
          n: listLength,
          length: 32,
          characters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
          replacement: true
        },
        id,
      },
      json: true
    });

    if ('error' in resp === true) {
      throw resp;
    }

    if (resp.id !== id) {
      throw new Error('Response id does not match request id');
    }

    seedList = resp.result.random.data.concat(seedList);
  } catch (error) {
    // we need this, trying to update until success
    logger.error('Random org string generation error', { MODULE_NAME, error });
    return _updateSeedList(listLength);
  }

  seedUpdatePromise = void 0;
};

const __generateHash = (seed, clientSeed, nonce) => {
  const baseStr = `${clientSeed}-${nonce}`;
  return crypto
    .createHmac("sha512", seed)
    .update(baseStr)
    .digest("hex");
};

/**
 * Calculate roll result
 *
 * @param {String} seed     Server seed
 * @param {*} clientSeed    Client seed
 * @param {*} index         Nonce
 */
const calculate = (seed, clientSeed, index) => {
  const result = __generateHash(seed, clientSeed, index);

  const subHash = result.substr(0, 7);
  const number = hexdec(subHash);

  return (number % 100000 + 1) / 1000;
};

const hexdec = (hexString) => {
  hexString = (hexString + '').replace(/[^a-f0-9]/gi, '');
  return parseInt(hexString, 16);
}

const changeServerHash = async (id, translate) => {
  const dice = await Dice.findById(id);

  if (!dice) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('global.notExistDicSession'));
  }
  if (dice.index > 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('global.changeSpeed'));
  }

  dice.seed = await getRandomSeed(dice.betId);
  dice.seedHash = __generateHash(dice.seed);

  await dice.save();

  return omit(dice.toObject(), unAllowedFields);
};

const changeClientSeed = async (id, clientSeed, translate) => {
  const dice = await Dice.findById(id);

  if (!dice) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('global.notExistDicSession'));
  }
  if (dice.index > 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('global.changeSpeed'));
  }

  dice.clientSeed = clientSeed;

  await dice.save();

  return true;
};

/**
 * Create dice session (seed starts from 0)
 *
 * @param {String} clientSeed   Client seed
 * @param {MongooseSession} session
 */
const createDice = async (clientSeed, session, testing) => {
  try {
    const payload = { testing, clientSeed };
    if (session) {
      params = [[{ testing, clientSeed }], { session }];
    }
    const [dice] = await Dice.create(...params);

    dice.seed = await getRandomSeed(dice.betId);
    dice.seedHash = __generateHash(dice.seed);

    await dice.save();

    return omit(dice.toObject(), unAllowedFields);
  } catch (error) {
    logger.error("Create Dice error", { error, MODULE_NAME });
    throw error;
  }
};

const createDices = async (clientSeeds, session, testing) => {
  const dicesPayload = [];

  try {
    // dices betId uses autoIncrement mongoose plugin
    // and it doesn't support insertMany, we need to increment and set it manually here
    const IdentityCounter = mongoose.model('IdentityCounter');

    // increment counter and get it as it was before update
    const updatedIdentityCounter = await IdentityCounter.findOneAndUpdate(
      { model: 'dices', field: 'betId' },
      { $inc: { count: clientSeeds.length } },
      {
        lean: true,
      },
    );

    for (const [id, clientSeed] of clientSeeds.entries()) {
      const seed = await getRandomSeed();
      const seedHash = __generateHash(seed);

      dicesPayload.push({
        betId: updatedIdentityCounter.count + id + 1,
        clientSeed,
        seed,
        seedHash,
        testing,
      });
    };

    const dices = await Dice.insertMany(dicesPayload, {
      session,
    });
    
    return dices.map((dice) => {
      return omit(dice.toObject(), unAllowedFields);
    });
  } catch (error) {
    logger.error("Create Dices error", { error, MODULE_NAME });
    throw error;
  }
};

/**
 * Get roll history
 *
 * @param {String} betId        Bet id to look up
 * @param {MongooseSession}     session
 */
const getRollHistory = async (betId, session, translate) => {
  let query = Dice.findOne({ betId });
  if (session) {
    query = query.session(session);
  }
  const dice = await query;

  if (!dice) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('global.notExistDicSession'));
  }

  const result = [];
  for (let i = 0; i < dice.index; i++) {
    const value = calculate(dice.seed, dice.clientSeed, i);
    result.push({
      index: i,
      value
    });
  }

  return result;
};

/**
 * Roll Result
 *
 * @param {String} id                  Bet Id / ObjectId of curernt dice
 * @param {MongooseSession} session
 * @param {Boolean} complete           Whether to complete current session or not
 * @param {Array} nonces               Nonces to calculate
 */
const rollResult = async (id, session, nonces, complete, translate) => {
  try {
    if (!nonces) {
      throw errorMaker(statusCodes.BAD_REQUEST, 'Nonces array is required');
    }

    let findQuery;
    if (typeof id === 'number') {
      findQuery = Dice.findOne({ betId: id });
    } else {
      findQuery = Dice.findById(id);
    }
    if (session) {
      findQuery = findQuery.session(session);
    }
    const dice = await findQuery;

    if (!dice) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('global.notExistDicSession'));
    }
    if (dice.status === diceStatuses.Completed) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('global.diceSessionClosed'));
    }

    const values = [];
    for (const nonce of nonces) {
      values.push(
        calculate(dice.seed, dice.clientSeed, nonce)
      );
    }

    const final = {
      values,
      seedHash: dice.seedHash,
      clientSeed: dice.clientSeed
    };

    // update current index
    dice.index = Math.max(...nonces);
    if (complete) {
      dice.status = diceStatuses.Completed;
      final.seed = dice.seed;
    }

    await dice.save();

    return final;
  } catch (error) {
    logger.error("Roll Result error", { error, MODULE_NAME });
    throw error;
  }
};

const getDice = async (betId, translate) => {
  const data = await Dice.findOne({ betId }).lean();

  if (data.status !== diceStatuses.Completed) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('global.diceSessionNotClosed'));
  }

  if (!data) {
    throw errorMaker(statusCodes.UNPROCESSABLE_ENTITY, translate('global.notExistDice'));
  }

  const caseOpening = await CaseOpening.findOne({ dices: data._id })
    .populate("user", "username name profileImageUrl")
    .populate("winItems", "name image value")
    .lean();

  if (caseOpening) {
    data.user = caseOpening.user;

    const index = caseOpening.dices
      .map(v => v.toString())
      .indexOf(data._id.toString());
    data.item = caseOpening.winItems[index];
    data.type = "UNBOXING";
  } else {
    const upgrade = await Upgrade.findOne({ dice: data._id })
      .populate("user", "username name profileImageUrl")
      .populate("targetItems", "name image value")
      .populate("sourceItems", "name image value")
      .lean();

    if (upgrade) {
      data.user = upgrade.user;
      data.sourceItems = upgrade.sourceItems;
      data.targetItems = upgrade.targetItems;
      data.winChance = upgrade.winChance;
      data.winChanceDirection = upgrade.winChanceDirection;
      data.type = "UPGRADE";
    }
  }

  return data;
};

// update seed list on start
// seedUpdatePromise = _updateSeedList();

module.exports = {
  createDice,
  createDices,
  getDice,
  rollResult,
  getRollHistory,
  changeServerHash,
  changeClientSeed,
  calculate
};
