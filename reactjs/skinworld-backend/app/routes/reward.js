const Joi = require("joi");
const router = require("express").Router();
const {
  twitter,
  facebook,
  discord,
  email,
  rewardsState,
} = require("../modules/reward");
const { utils } = require("../helpers");
const querystring = require("querystring");

const { validate, isAuthenticated } = require("../middleware");
const { translate } = require('../i18n');
const { errorMaker } = require('../helpers')

const claimFacebookSchema = {
  signedRequest: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'reward.signedRequest')
};

const claimDiscordSchema = {
  accessToken: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'reward.accessToken')
};

const claimTwitterSchema = {
  oauthToken: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'reward.oauthToken'),
  oauthVerifier: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'reward.oauthVerifier')
};

// router.get('/rewards-state', isAuthenticated, async (req, res, next) => {
//   try {
//     const response = await reward.getRewardsState(req.token.id);
//
//     return utils.sendSuccessResponse(req, res, response);
//   } catch (error) {
//     next(error);
//   }
// });

router.get(
  "/init-twitter-claiming",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const oauthToken = await twitter.initTwitterClaiming(req.token.id, req.translate);

      // redirect to twitter
      res.redirect(
        "https://api.twitter.com/oauth/authenticate" +
          "?" +
          querystring.stringify({ oauth_token: oauthToken })
      );
    } catch (error) {
      return utils.sendResponse(res, error);

      // res.redirect(`https://${config.app.frontHost}/rewards`);
    }
  }
);

router.post(
  "/claim-twitter",
  // validate(claimTwitterSchema, 'body'),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const response = await twitter.claimTwitter(req.token.id, req.body);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/claim-facebook",
  // validate(claimFacebookSchema, 'body'),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const response = await facebook.claimFacebook(
        req.token.id,
        req.body.signedRequest
      );

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/claim-discord",
  validate(claimDiscordSchema, "body"),
  isAuthenticated,
  async (req, res, next) => {
    try {
      const response = await discord.claimDiscord(
        req.token.id,
        req.body.accessToken,
        req.translate,
      );

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get("/claim-email", isAuthenticated, async (req, res, next) => {
  try {
    const response = await email.claimEmail(req.token.id, req.translate);

    return utils.sendResponse(res, response);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

module.exports = router;
