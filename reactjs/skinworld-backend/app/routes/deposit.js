const Joi = require('joi');
const router = require('express').Router();
const querystring = require('querystring');
const url = require('url');
const { utils, statusCodes, errorMaker } = require('../helpers');
const {
  getUserInventory: getSteamUserInventory,
  sendTradeOffer: sendSteamTradeOffer,
  updateTradeUrl
} = require("../modules/trade-providers").steamProvider;
const bodyParser = require("body-parser");
const { validate, isAuthenticated, has } = require("../middleware");
const crypto = require("crypto");
const config = require("../../config");
const {
  coinpayments,
  g2a,
  coinbase,
  giftcard,
  payop,
  helpers: depositHelpers
} = require("../modules/deposit");
const logger = require("../modules/logger");
const MODULE_NAME = "DEPOSIT";
const { translate } = require('../i18n');

const getSteamInventorySchema = {
  appId: Joi.number()
    .integer()
    .positive()
    .required()
    .errorTranslate('BAD_REQUEST', 'deposit.appId'),
  contextId: Joi.number()
    .integer()
    .positive()
    .required()
    .errorTranslate('BAD_REQUEST', 'deposit.contextId'),
  startAssetId: Joi.string(),
};

const requestOfferSchema = {
  items: Joi.array()
    .items(
      Joi.object().keys({
        assetId: Joi.string().required()
          .errorTranslate('BAD_REQUEST', 'deposit.assetId'),
        appId: Joi.number().integer().positive().required()
          .errorTranslate('BAD_REQUEST', 'deposit.appId'),
        contextId: Joi.number().integer().positive().required()
          .errorTranslate('BAD_REQUEST', 'deposit.contextId'),
        amount: Joi.number().integer().positive().required()
          .errorTranslate('BAD_REQUEST', 'deposit.amount'),
      })
    )
    .unique('assetId')
    .required(),
  coupon: Joi.string(),
};

const updateTradeUrlSchema = {
  tradeUrl: Joi.string()
    .uri({
      scheme: [ 'https', 'http' ],
    })
    .required()
    .errorTranslate('BAD_REQUEST', 'deposit.tradeUrl')
};

const createG2AQuoteSchema = {
  depositValue: Joi.number()
    .min(1)
    .required()
    .errorTranslate('BAD_REQUEST', 'deposit.depositValue'),
  coupon: Joi.string(),
  paymentOption: Joi.string()
};
 
const processG2AIPNSchema = {
  transactionId: Joi.string().required(),
  userOrderId: Joi.string().required(),
  amount: Joi.number()
    .min(1)
    .required(),
  hash: Joi.string().required(),
  type: Joi.string(),
  currency: Joi.string(),
  status: Joi.string(),
  orderCreatedAt: Joi.string(),
  orderCreatedAt: Joi.string(),
  orderCompleteAt: Joi.string(),
  refundedAmount: Joi.number(),
  provisionAmount: Joi.number(),
  email: Joi.string().email(),
  paymentMethod: Joi.string(),
  paymentMethodGroup: Joi.string(),
  isCash: Joi.string(),
  sendPush: Joi.string(),
  processingTime: Joi.string()
};

const requestCoinbaseDepositSchema = {
  depositAmount: Joi.number()
    .greater(0)
    .required()
    .errorTranslate('BAD_REQUEST', 'deposit.depositAmount'),
  coupon: Joi.string(),
};

const requestPayopDepositSchema = {
  depositAmount: Joi.number()
    .greater(0)
    .required()
    .errorTranslate('BAD_REQUEST', 'deposit.depositAmount'),
  coupon: Joi.string(),
};

const requestGiftcardSchema = {
  code: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'deposit.giftcard')
};

const validatePromocodeSchema = {
  code: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'deposit.promocode')
};

router.post(
  "/get-steam-inventory",
  validate(getSteamInventorySchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const response = await getSteamUserInventory(req.token.id, req.body, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/request-offer",
  validate(requestOfferSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { items, coupon } = req.body;
      const response = await sendSteamTradeOffer(req.token.id, items, coupon, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/update-trade-url",
  validate(updateTradeUrlSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      // validate trade url format
      const tradeUrl = req.body.tradeUrl;
      const tradeUrlParsed = url.parse(tradeUrl);
      const tradeUrlQs = querystring.parse(tradeUrlParsed.query);

      if (
        tradeUrl.startsWith("https://steamcommunity.com/tradeoffer") ===
          false ||
        tradeUrlQs.partner === void 0 ||
        tradeUrlQs.token === void 0
      ) {
        throw errorMaker(statusCodes.BAD_REQUEST, translate('deposit.wrongTradeURLFormat'));
      }

      const response = await updateTradeUrl(req.token.id, tradeUrl, req.translate);
      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/process-cp-ipn",
  bodyParser.raw({ type: "*/*" }),
  async (req, res, next) => {
    try {
      logger.info("Coinpayment IPN processing", { MODULE_NAME });
      // validate hmac
      const hmacSignature = req.header("HMAC");

      if (hmacSignature === void 0 || hmacSignature.length !== 128) {
        // HMAC is missing or in wrong format
        return utils.sendResponse(res);
      }

      const rawBody = req.body;
      const hmac = crypto.createHmac(
        "sha512",
        config.app.coinpaymentsIpnSecret
      );
      hmac.update(rawBody);
      const hmacResult = hmac.digest("hex");

      if (hmacResult !== hmacSignature) {
        // HMAC signature isn't correct
        return utils.sendResponse(res);
      }

      const parsedBody = querystring.parse(rawBody.toString("utf8"));

      logger.info("Coinpayment IPN body", { data: parsedBody, MODULE_NAME });

      await coinpayments.processIpn(parsedBody);

      return utils.sendResponse(res);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/create-g2a-quote",
  validate(createG2AQuoteSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { depositValue, coupon, paymentOption } = req.body;
      const response = await g2a.startDeposit(
        req.token.id,
        depositValue,
        req.ip,
        coupon,
        paymentOption,
        req.translate,
      );

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/process-g2a-ipn",
  validate(processG2AIPNSchema, "body"),
  async (req, res, next) => {
    const body = req.body;
    const IPN_SERVER_IP = "13.95.137.218";

    // DEBUG
    logger.info("G2A IPN body", { data: body, MODULE_NAME });

    // validate hash(signature)
    const amount = Number((+body.amount).toFixed(2));
    const requestHmac = crypto.createHmac("sha256", config.app.g2aApiSecret);
    requestHmac.update(
      `${body.transactionId}${body.userOrderId}${amount}${config.app.g2aApiSecret}`
    );
    logger.info("hash after submit", {
      txId: body.transactionId,
      userId: body.userOrderId,
      amount,
      MODULE_NAME,
      ip: req.ip
    });
    const hmacValue = requestHmac.digest("hex");
    logger.info("incoming hash", { hmacValue, MODULE_NAME });

    if (req.ip !== IPN_SERVER_IP) {
      logger.error("wrong ipn server request", {
        txId: body.transactionId,
        userId: body.userOrderId,
        amount,
        MODULE_NAME,
        ip: req.ip
      });
      // wrong ipn server
      return utils.sendResponse(res);
    }

    // if (hmacValue !== body.hash) {
    //   // wrong signature
    //   return res.end();
    // }

    await g2a.processIpn(body);

    return utils.sendResponse(res);
  }
);

router.post(
  "/request-coinbase-deposit",
  validate(requestCoinbaseDepositSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { depositAmount, coupon } = req.body;
      const response = await coinbase.initDeposit(
        req.token.id,
        depositAmount,
        coupon,
        req.translate,
      );

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/request-payop-deposit",
  validate(requestPayopDepositSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { depositAmount, coupon } = req.body;
      const response = await payop.initDeposit(
        req.token.id,
        depositAmount,
        coupon,
        req.translate,
      );

      return utils.sendResponse(res, response);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/process-coinbase-webhook",
  bodyParser.raw({ type: "*/*" }),
  async (req, res, next) => {
    const body = req.body;

    const signature = req.header("X-CC-Webhook-Signature");
    const isSignatureValid = coinbase.verifySignature(body, signature);
    const parsedBody = JSON.parse(body);

    if (isSignatureValid !== true) {
      return utils.sendResponse(res, errorMaker(statusCodes.BAD_REQUEST));
    }

    logger.log("Conbase IPN body", {
      body: parsedBody,
      isSignatureValid,
      signature,
      MODULE_NAME
    });

    try {
      await coinbase.processWebhook(parsedBody);
    } catch (err) {
      return utils.sendResponse(res, err);
    }

    return utils.sendResponse(res);
  }
);

router.post(
  "/process-payop-webhook",
  async (req, res, next) => {
    try {
      logger.log("PayOP IPN body", {
        body: req.body,
        MODULE_NAME
      });
      await payop.processWebhook(req.body);
    } catch (err) {
      return res.status(400);
    }

    return res.end();
  }
);

router.post(
  "/validate-promocode",
  validate(validatePromocodeSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { id } = req.token;
      const { code } = req.body;
      const response = await depositHelpers.validateCode(id, code.trim(), req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/request-giftcard-deposit",
  validate(requestGiftcardSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { id } = req.token;
      const { code } = req.body;
      const response = await giftcard.deposit(id, code, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

module.exports = router;
