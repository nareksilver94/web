const Joi = require('joi');
const router = require('express').Router();
const UpgradeModule = require('../modules/upgrades');
const { utils, errorMaker } = require('../helpers');
const { winChanceDirections, userTypes, sortDirections, upgradeStatuses } = require('../constants');

const { validate, isAuthenticated } = require('../middleware');
const { translate } = require('../i18n');

const createUpgradeSchema = {
  userItems: Joi.array().required(),
  targetItems: Joi.array().required(),
  multiplier: Joi.number()
    .greater(1)
    .errorTranslate('BAD_REQUEST', 'validation.multiplier', { value: 1 }),
  winChanceDirection: Joi.string()
    .valid(Object.values(winChanceDirections))
    .required()
    .errorTranslate('BAD_REQUEST', 'validation.winChanceDirection', { value: Object.values(winChanceDirections).join(', ') }),
  seed: Joi.string().required()
};

const getUpgradesSchema = {
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
  sortBy: Joi.string()
    .errorTranslate('BAD_REQUEST', 'validation.sortBy'),
  sortDirection: Joi.string()
    .valid(['asc', 'desc'])
    .when('sortBy', {
      is: Joi.exist(),
      then: Joi.exist()
    })
    .errorTranslate('BAD_REQUEST', 'validation.sortDirection', { value: Object.keys(sortDirections).join(', ') }),
  user: Joi.string()
};

router.post(
  "/",
  validate(createUpgradeSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { id: user } = req.token;
      const payload = { ...req.body, user };
      const data = await UpgradeModule.createUpgrade(payload, req.translate);

      return utils.sendResponse(res, data);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get(
  "/",
  isAuthenticated,
  validate(getUpgradesSchema),
  async (req, res, next) => {
    try {
      let { limit, offset, sortBy, sortDirection, ...query } = req.query;
      const { id: userId, type } = req.token;
      let pagination, sort;

      if (type !== userTypes.Admin) {
        query.user = userId;
      }
      if (limit && offset) {
        pagination = {
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
      }
      if (sortBy && sortDirection) {
        sort = { [sortBy]: sortDirections[sortDirection] };
      }
      const data = await UpgradeModule.getUpgrades(query, pagination, sort);

      return utils.sendResponse(res, data);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get("/latest", async (req, res, next) => {
  try {
    const pagination = { limit: 10, offset: 0 };
    const sort = "-createdAt";
    const data = await UpgradeModule.getUpgrades(
      { status: upgradeStatuses.Win },
      pagination,
      sort
    );

    return utils.sendResponse(res, data);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.post("/:id/roll", isAuthenticated, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.token;
    const data = await UpgradeModule.processUpgrade(id, userId, req.translate);

    return utils.sendResponse(res, data);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.delete("/:id", isAuthenticated, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: user } = req.token;
    const result = await UpgradeModule.deleteUpgrade(user, id);

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

module.exports = router;
