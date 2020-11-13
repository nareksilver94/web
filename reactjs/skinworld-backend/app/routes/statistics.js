const router = require("express").Router();
const Joi = require("joi");
const { validate, isAuthenticated, has } = require("../middleware");
const statistics = require("../modules/statistics");
const { utils, statusCodes } = require("../helpers");
const { userTypes, sortDirections } = require("../constants");
const { translate } = require('../i18n');
const { errorMaker } = require('../helpers')

// every route here is just for admins
router.get('/', isAuthenticated, has(userTypes.Admin));
router.post('/', isAuthenticated, has(userTypes.Admin));

const casesProfitSchema = {
  caseIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .errorTranslate('BAD_REQUEST', 'case.caseId')
};

router.post(
  "/cases-profit",
  validate(casesProfitSchema, "body"),
  async (req, res, next) => {
    try {
      const response = await statistics.cases.getCasesProfit(req.body.caseIds);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get("/total-profit", async (req, res, next) => {
  try {
    const response = await statistics.cases.getTotalProfit();

    return utils.sendResponse(res, response);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.get("/get-popular-cases", async (req, res, next) => {
  try {
    const response = await statistics.cases.getPopularCases();

    return utils.sendResponse(res, response);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.get("/:caseId", async (req, res, next) => {
  try {
    const response = await statistics.cases.getCaseStatistics(
      req.params.caseId
    );

    return utils.sendResponse(res, response);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.get(
  "/",
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
      const response = await statistics.cases.getStatistics(__query);
      return utils.sendResponse(res, response);

    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

module.exports = router;
