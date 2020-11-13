const Joi = require('joi');
const router = require('express').Router();
const { AffiliateModule } = require('../modules');
const { utils, errorMaker } = require('../helpers');
const { validate, isAuthenticated, has } = require('../middleware');
const { translate } = require('../i18n');

const refCodeType = Joi.string()
  .min(1)
  .max(10)
  .regex(/^[0-9a-zA-Z$_-]+$/);

const applyRefCodeSchema = {
  refCode: Joi.alternatives()
    .try(
      refCodeType,
      Joi.string().guid({
        version: [
          'uuidv1'
        ]
      }),
    )
    .required()
    .errorTranslate('BAD_REQUEST', 'validation.refCode', { min: 4, max: 10 }),
};

const setRefCodeSchema = {
  refCode: refCodeType
    .required()
    .errorTranslate('BAD_REQUEST', 'validation.email'),
};

const sendInviteSchema = {
  email: Joi.string()
    .email()
    .required()
    .errorTranslate('BAD_REQUEST', 'validation.email'),
};

router.post(
  "/apply-ref-code",
  validate(applyRefCodeSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const result = await AffiliateModule.applyRefCode(
        req.token.id,
        req.body.refCode,
        req.translate
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

// set new ref code
router.post(
  "/set-ref-code",
  validate(setRefCodeSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const result = await AffiliateModule.setRefCode(
        req.token.id,
        req.body.refCode,
        req.translate
      );

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get("/claim-fee", isAuthenticated, async (req, res, next) => {
  try {
    const result = await AffiliateModule.claimFee(req.token.id, req.translate);

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.get("/get-info", isAuthenticated, async (req, res, next) => {
  try {
    const result = await AffiliateModule.getUserInfo(req.token.id, req.translate);

    return utils.sendResponse(res, result);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.post(
  "/send-invite",
  validate(sendInviteSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const result = await AffiliateModule.sendInvite(req.token.id, req.body.email, req.translate);

      return utils.sendResponse(res, result);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

module.exports = router;
