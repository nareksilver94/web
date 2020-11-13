const Joi = require("joi");
const mongoose = require("mongoose");
const router = require("express").Router();

const { TransactionModule } = require('../modules');
const { validate, isAuthenticated, has } = require('../middleware');
const { transactionTypes, userTypes, sortDirections } = require('../constants');
const { errorMaker, utils } = require('../helpers');
const { translate } = require('../i18n');

const getTransactionsSchema = {
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
  transactionType: Joi.string()
    .valid(Object.values(transactionTypes))
    .errorTranslate('BAD_REQUEST', 'validation.txType', { value: Object.values(transactionTypes).join(', ') }),
  user: Joi.string(),
  search: Joi.string()
};

router.get(
  "/",
  validate(getTransactionsSchema),
  isAuthenticated,
  async (req, res, next) => {
    try {
      let { limit, offset, sortBy, sortDirection, ...query } = req.query;
      const { id, type } = req.token;
      const __query = { query };

      if (type !== userTypes.Admin) {
        __query.query = __query.query || {};
        __query.query.user = mongoose.Types.ObjectId(id);
      } else {
        if (query.user) {
          query.user = mongoose.Types.ObjectId(query.user);
        }
      }

      if (limit && offset) {
        __query.pagination = {
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
      }
      if (sortBy && sortDirection) {
        __query.sort = { [sortBy]: sortDirections[sortDirection] };
      }
      const result = await TransactionModule.getTransactions(__query);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

module.exports = router;
