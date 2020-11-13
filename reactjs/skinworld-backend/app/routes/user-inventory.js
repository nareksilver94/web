const Joi = require("joi");
const router = require("express").Router();
const mongoose = require("mongoose");

const { InventoryModule } = require("../modules");
const { validate, isAuthenticated, has } = require("../middleware");
const { itemTypes, userTypes, sortDirections } = require("../constants");
const { translate } = require('../i18n');
const { errorMaker, utils } = require('../helpers')

const addItemSchema = {
  data: Joi.array()
    .items(
      Joi.object({
        assetId: Joi.string(),
        name: Joi.string().required()
          .errorTranslate('BAD_REQUEST', 'validation.name'),
        type: Joi.string().valid(Object.values(itemTypes)).required()
          .errorTranslate('BAD_REQUEST', 'validation.itemType'),
        image: Joi.string(),
        value: Joi.number().positive().required()
          .errorTranslate('BAD_REQUEST', 'validation.itemValue')
      })
    )
}

const getItemsSchema = {
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
    .valid(Object.keys(sortDirections))
    .when('sortBy', {
      is: Joi.exist(),
      then: Joi.exist()
    })
    .errorTranslate('BAD_REQUEST', 'validation.sortDirection', { value: Object.keys(sortDirections).join(', ') }),
  user: Joi.string(),
  search: Joi.string(),
  battle: Joi.string()
};

const sellItemsSchema = {
  items: Joi.array()
    .items(Joi.string())
    .required()
    .errorTranslate('BAD_REQUEST', 'validation.items')
};

router.get(
  "/",
  isAuthenticated,
  validate(getItemsSchema),
  async (req, res, next) => {
    try {
      let { limit, offset, sortBy, sortDirection, ...query } = req.query;
      const { id: userId, type } = req.token;
      let pagination, sort;

      query.user = mongoose.Types.ObjectId(userId);

      if (limit && offset) {
        pagination = {
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
      }
      if (sortBy && sortDirection) {
        sort = { [`item.${sortBy}`]: sortDirections[sortDirection] };
      }

      const result = await InventoryModule.getUserInventory(
        query,
        pagination,
        sort
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/",
  isAuthenticated,
  has(userTypes.Admin),
  validate(addItemSchema),
  async (req, res, next) => {
    try {
      const payload = req.body.data;
      const result = await InventoryModule.addUserItems(payload, req.token.id);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/sell",
  isAuthenticated,
  validate(sellItemsSchema),
  async (req, res, next) => {
    try {
      const { items } = req.body;
      const { id: userId } = req.token;
      const result = await InventoryModule.sellItem(userId, items, req.translate);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

module.exports = router;
