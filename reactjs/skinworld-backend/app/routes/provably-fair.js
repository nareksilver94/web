const Joi = require("joi");
const router = require("express").Router();

const ProvablyFairModule = require("../modules/probably-fair");
const { validate, isAuthenticated } = require("../middleware");
const { utils } = require("../helpers");
const { translate } = require('../i18n');
const { errorMaker } = require('../helpers')

const getBetSchema = {
  id: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'validation.betId')
};

router.get(
  "/:id",
  validate(getBetSchema),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const response = await ProvablyFairModule.getDice(id, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

module.exports = router;
