const Joi = require("joi");
const mongoose = require("mongoose");
const router = require("express").Router();

const { CaseOpeningModule } = require('../modules');
const { validate, isAuthenticated } = require('../middleware');
const { userTypes } = require('../constants');
const statistics = require('../modules/statistics');
const logger = require('../modules/logger');
const { translate } = require('../i18n');
const { errorMaker, utils } = require('../helpers');

const MODULE_NAME = 'CASE_OPENING';

const getCaseOpeningSchema = {
  id: Joi.string().required(),
  freeCode: Joi.string()
};

const getCaseOpeningsSchema = {
  limit: Joi.number()
    .integer()
    .positive()
    .errorTranslate('BAD_REQUEST', 'validation.limit', { value: 0 }),
  offset: Joi.number()
    .integer()
    .when('limit', {
      is: Joi.exist(),
      then: Joi.exist()
    })
    .errorTranslate('BAD_REQUEST', 'validation.offset', { value: 0 }),
  user: Joi.string()
};

const changeSeedSchema = {
  id: Joi.string().required(),
  diceId: Joi.string().required()
};

const changeClientSeedSchema = {
  id: Joi.string().required(),
  clientSeed: Joi.string().required()
};

const createCaseOpeningSchema = {
  seed: Joi.string().required(),
  caseId: Joi.string().required(),
  count: Joi.number()
    .integer()
    .min(1)
    .max(3)
    .errorTranslate('BAD_REQUEST', 'validation.count', { min: 1, max: 3 }),
}

const redeemCodeSchema = {
  freeCode: Joi.string().required()
}

router.get(
  "/",
  validate(getCaseOpeningsSchema),
  isAuthenticated,
  async (req, res, next) => {
    try {
      let { limit, offset, ...query } = req.query;
      const { id, type } = req.token;
      const __query = { query };

      if (type !== userTypes.Admin) {
        __query.query.user = mongoose.Types.ObjectId(id);
      } else if (query.user) {
        query.user = mongoose.Types.ObjectId(query.user);
      }
      if (limit && offset) {
        __query.pagination = {
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
      }

      const result = await CaseOpeningModule.getCaseOpenings(__query);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get("/latest-drops", async (req, res, next) => {
  try {
    const result = await CaseOpeningModule.getLatestLiveDrops();

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.get(
  "/:id",
  validate(getCaseOpeningSchema),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { id: user } = req.token;
      const result = await CaseOpeningModule.getCaseOpening(user, id, req.translate);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/redeem",
  validate(redeemCodeSchema),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { freeCode } = req.body;
      const result = await CaseOpeningModule.getCaseIdFromCode(
        req.token.id,
        freeCode,
        req.translate
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      logger.error("Create case error", { error, MODULE_NAME });
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/:id/roll",
  validate(getCaseOpeningSchema),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { id: userId } = req.token;
      const { translate, isTest: testing } = req;
      const result = await CaseOpeningModule.rollCaseOpening({
        id,
        userId,
        complete: true,
        translate,
        testing
      });

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/:id/dices/:diceId/change-seed",
  validate(changeSeedSchema),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { diceId } = req.params;
      const result = await CaseOpeningModule.updateServerHash(diceId, req.translate);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/:id/change-client-seed",
  validate(changeClientSeedSchema),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { clientSeed } = req.body;
      const result = await CaseOpeningModule.updateClientSeed(id, clientSeed, req.translate);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/",
  validate(createCaseOpeningSchema),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const payload = req.body;
      const { isTest: testing, translate } = req;

      payload.user = req.token.id;
      if (!payload.count) {
        payload.count = 1;
      }

      const [{ _id, nonce, dice }] = await CaseOpeningModule.openCase({
        payload: [payload],
        testing,
        translate
      });

      return utils.sendResponse(res, { _id, nonce, dice });
    } catch (error) {
      logger.error("Create case error", { error, MODULE_NAME });
      return utils.sendResponse(res, error);
    }
  }
);

module.exports = router;
