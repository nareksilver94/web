const Joi = require('joi');
const router = require('express').Router();
const { errorMaker, utils } = require('../helpers');
const { userTypes } = require('../constants');

const { BattleModule } = require('../modules');
const { validate, isAuthenticated, has } = require('../middleware');

const createBattleSchema = {
  private: Joi.boolean(),
  seed: Joi.string()
    .required()
    .errorTranslate('BAD_REQUEST', 'battle.seedRequired'),
  cases: Joi.array()
    .items(
      Joi.object({
        case: Joi.string()
          .required(),
        count: Joi.number()
          .integer()
          .min(1)
          .max(50)
          .required()
      })
    )
    .required(),
  userCount: Joi.number()
    .integer()
    .min(2)
    .max(4)
    .errorTranslate('BAD_REQUEST', 'battle.userCountInvalid', { min: 2, max: 4 }),
};

const joinBattleSchema = {
  seed: Joi.string()
    .required()
    .errorTranslate('BAD_REQUEST', 'battle.seedRequired'),
};

const getBattlesSchema = {
  type: Joi.string().valid(['mine', 'history', 'list'])
};


router.get(
  '/',
  validate(getBattlesSchema),
  isAuthenticated,
  async (req, res, next) => {
  
  try {
    const { type } = req.query;
    const { id: userId } = req.token;
    const result = await BattleModule.getBattles(userId, type);

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }

});

router.get(
  '/:id',
  isAuthenticated,
  async (req, res, next) => {
  
  try {
    const { id: userId } = req.token;
    const { id } = req.params;
    const { translate } = req;
    const result = await BattleModule.getBattle(id, userId, translate);

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }

});

router.post(
  '/',
  validate(createBattleSchema, 'body'),
  isAuthenticated,
  async (req, res, next) => {
  
  try {
    const { id: userId } = req.token;
    const { seed, cases, userCount, private } = req.body;
    const { translate } = req;

    const result = await BattleModule.createBattle({
      userId,
      cases,
      seed,
      userCount,
      private,
      translate
    });

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }

});

router.post(
  '/:id/join',
  validate(joinBattleSchema, 'body'),
  isAuthenticated,
  async (req, res, next) => {
  
  try {
    const { id } = req.params;
    const { id: userId } = req.token;
    const { seed } = req.body;
    const { translate } = req;

    const result = await BattleModule.joinBattle({ id, userId, seed, translate });

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }

});

router.post(
  '/:id/quit',
  isAuthenticated,
  async (req, res, next) => {
  
  try {
    const { id } = req.params;
    const { id: userId } = req.token;
    const { translate } = req;

    const result = await BattleModule.quitBattle({ id, userId, translate });

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }

});

router.post(
  '/:id/ready',
  isAuthenticated,
  async (req, res, next) => {
  
  try {
    const { id } = req.params;
    const { id: userId } = req.token;
    const { translate } = req;

    const result = await BattleModule.setReadyForBattle({ id, userId, translate });

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }

});

router.post(
  '/:id/roll',
  isAuthenticated,
  async (req, res, next) => {
  
  try {
    const { id } = req.params;
    const { id: userId } = req.token;
    const { translate } = req;

    const result = await BattleModule.startBattle({ id, userId, translate });

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }

});

router.post(
  '/:id/cancel',
  isAuthenticated,
  async (req, res, next) => {
  
  try {
    const { id } = req.params;
    const { id: userId } = req.token;
    const { translate } = req;

    const result = await BattleModule.cancelBattle({ id, userId, translate });

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }

});


module.exports = router;
