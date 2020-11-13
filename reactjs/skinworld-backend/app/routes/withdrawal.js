const Joi = require("joi");
const router = require("express").Router();
const { WithdrawalModule } = require("../modules");
const { validate, isAuthenticated, has } = require("../middleware");
const {
  withdrawalTypes,
  withdrawalStatuses,
  userTypes,
  shippingCountries,
  orderStatuses
} = require("../constants");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const config = require("../../config");
const { translate } = require('../i18n');
const { errorMaker, utils, statusCodes } = require('../helpers')

const getWithdrawalsSchema = {
  status: Joi.string()
    .valid(Object.values(withdrawalStatuses)),
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
    }),
  'order.status': Joi.string()
    .valid(Object.values(orderStatuses))
}

const shippingAddressSchema = {
  firstName: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.firstName'),
  lastName: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.lastName'),
  phoneNumber: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.phoneNumber'),
  address: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.address'),
  postalCode: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.postalCode'),
  country: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.country'),
  city: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.city'),
  province: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.province'),
  email: Joi.string()
    .email()
    .required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.email')
};

const updateShippingAddressSchema = shippingAddressSchema;

const createWithdrawalSchema = {
  withdrawalOption: Joi.string()
    .valid(Object.values(withdrawalTypes))
    .required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.wrongWithdrawalOption'),
  shipping: Joi.when("withdrawalOption", {
    is: withdrawalTypes.RealWorld,
    then: shippingAddressSchema,
    otherwise: Joi.forbidden()
  }),
  items: Joi.array().items(
    Joi.object().keys({
      // _id from user-items collection
      id: Joi.string().required()
        .errorTranslate('BAD_REQUEST', 'withdrawal.noVariantId'),
      details: Joi.object()
    })
  )
};

const updateWithdrawalSchema = {
  id: Joi.string(),
  trackingNumber: Joi.string(),
  status: Joi.string()
    .valid(Object.values(withdrawalStatuses)),
  order: Joi.object().keys({
    status: Joi.string()
      .valid(Object.values(orderStatuses)),
    orderId: Joi.string(),
    stockxOrderId: Joi.string(),
    stockxTrackingId: Joi.string(),
    myUsTrackingId: Joi.string(),
  })
};

const getTrackingByTokenSchema = {
  token: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.wrongToken'),
};

const getVariantAdditionalFeesSchema = {
  siteItemId: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.notExistSiteItem'),
  variantId: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'withdrawal.noVariantId')
};

router.post(
  "/update-shipping-address",
  validate(updateShippingAddressSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const response = await WithdrawalModule.updateShippingAddress(
        req.token.id,
        req.body,
        req.translate,
      );

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get(
  "/",
  validate(getWithdrawalsSchema, "query"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { id, type } = req.token;
      const { limit, offset, ...otherQuery } = req.query;
      const userId = type === userTypes.User ? id : "";
      const response = await WithdrawalModule.getUserWithdrawals({
        userId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        ...otherQuery
      });

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get("/shipping-countries", async (req, res, next) => {
  try {
    const response = {
      data: shippingCountries
    };

    return utils.sendResponse(res, response);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.post(
  "/",
  validate(createWithdrawalSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const response = await WithdrawalModule.createWithdrawal(
        req.token.id,
        req.body,
        req.translate,
      );

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/aftership-wh",
  bodyParser.raw({ type: "application/json" }),
  async (req, res, next) => {
    if (req.body instanceof Buffer === false) {
      return utils.sendResponse(res, errorMaker(statusCodes.BAD_REQUEST));
    }

    try {
      // validate hmac(it's coming in base64 encoding)
      const hmacSignature = req.header("aftership-hmac-sha256");

      if (hmacSignature === void 0 || hmacSignature.length !== 44) {
        // HMAC is missing or in wrong format
        return utils.sendResponse(res, errorMaker(statusCodes.BAD_REQUEST));
      }

      const rawBody = req.body;

      const hmac = crypto.createHmac(
        "sha256",
        config.app.aftershipWebhookSecret
      );
      hmac.update(rawBody);
      const hmacResult = hmac.digest("base64");

      if (hmacResult !== hmacSignature) {
        // HMAC signature isn't correct
        return utils.sendResponse(res, errorMaker(statusCodes.BAD_REQUEST));
      }

      let parsedPayload;

      try {
        parsedPayload = JSON.parse(rawBody.toString("utf8"));
      } catch (error) {
        return utils.sendResponse(res, errorMaker(statusCodes.BAD_REQUEST));
      }

      await WithdrawalModule.processAftershipWebhook(parsedPayload);

      return utils.sendResponse(res);
    } catch (error) {
      console.error("Aftership Webhook error", error);
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/remove",
  async (req, res, next) => {
    try {
      const withdrawalIds = req.body;
      let response = await WithdrawalModule.removeWithdrawals(withdrawalIds);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/get-tracking-by-token",
  validate(getTrackingByTokenSchema, "body"),
  async (req, res, next) => {
    try {
      const response = await WithdrawalModule.getTrackingByToken(
        req.body.token,
        req.translate,
      );

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/get-additional-fees",
  validate(getVariantAdditionalFeesSchema, "body"),
  async (req, res, next) => {
    try {
      const response = await WithdrawalModule.getVariantAdditionalFees(
        req.body.siteItemId,
        req.body.variantId,
        req.translate,
      );

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.put(
  "/:id",
  validate(updateWithdrawalSchema),
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      const { trackingNumber, status, order } = req.body;
      const { id } = req.params;
      let response = {};

      if (trackingNumber) {
        response = await WithdrawalModule.addTracking(id, trackingNumber, req.translate);
      }
      if (status || order) {
        response = await WithdrawalModule.updateWithdrawal({ id, status, order }, req.translate);
      }

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

module.exports = router;
