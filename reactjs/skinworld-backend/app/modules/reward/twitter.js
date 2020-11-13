const { statusCodes, errorMaker } = require("../../helpers");
const User = require("../../models/user");
const mongoose = require("mongoose");
const base64url = require("base64url");
const crypto = require("crypto");
const request = require("request-promise-native");
const querystring = require("querystring");
const config = require("../../../config");
const { userStatuses } = require("../../constants");
const globalEvent = require("../event");

async function initTwitterClaiming(userId, translate) {
  const user = await User.findById(userId);

  if (user.rewards.twitter.claimed === true) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('reward.rewardClaimed'));
  }

  // request token for oauth 1.0
  const requestTokenResult = await request.post({
    uri: "https://api.twitter.com/oauth/request_token",
    oauth: {
      consumer_key: config.app.twitterConsumerKey,
      consumer_secret: config.app.twitterConsumerSecret,
      callback: `https://${config.app.frontHost}/rewards`
    }
  });

  const parsedResult = querystring.parse(requestTokenResult);

  if (
    parsedResult.oauth_token === void 0 ||
    parsedResult.oauth_token_secret === void 0
  ) {
    throw errorMaker(statusCodes.INTERNAL_SERVER_ERROR, translate('global.serverError'));
  }

  await user.update({
    $set: {
      "twitter.oauth_token": parsedResult.oauth_token,
      "twitter.oauth_token_secret": parsedResult.oauth_token_secret
    }
  });

  return parsedResult.oauth_token;
}

async function claimTwitter(userId, { oauthToken, oauthVerifier }) {
  const TWITTER_REWARD = 0.5;
  const user = await User.findById(userId);

  // if (user.rewards.twitter.claimed === true) {
  //   throw {
  //     status: statusCodes.BAD_REQUEST,
  //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
  //     description: 'Reward already claimed',
  //   };
  // }

  // if (
  //   user.twitter.oauth_token === void 0
  //   || user.twitter.oauth_token_secret === void 0
  // ) {
  //   throw {
  //     status: statusCodes.BAD_REQUEST,
  //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
  //     description: 'OAuth process was not initiated',
  //   };
  // }

  // if (oauthToken !== user.twitter.oauth_token) {
  //   throw {
  //     status: statusCodes.BAD_REQUEST,
  //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
  //     description: 'Wrong oauth_token',
  //   };
  // }

  // // fetch access token
  // const accessTokenResult = querystring.parse(await request.post({
  //   uri: 'https://api.twitter.com/oauth/access_token',
  //   oauth: {
  //     consumer_key: config.app.twitterConsumerKey,
  //     consumer_secret: config.app.twitterConsumerSecret,
  //     token: user.twitter.oauth_token,
  //     token_secret: user.twitter.oauth_token_secret,
  //     verifier: user.twitter.oauthVerifier,
  //   },
  // }));

  // const twitterOauth = {
  //   consumer_key: config.app.twitterConsumerKey,
  //   consumer_secret: config.app.twitterConsumerSecret,
  //   token: accessTokenResult.oauth_token,
  //   token_secret: accessTokenResult.oauth_token_secret,
  // };

  // // fetch user account data
  // const userTwitter = await request.post({
  //   uri: 'https://api.twitter.com/1.1/account/verify_credentials.json',
  //   oauth: twitterOauth,
  //   json: true,
  // });

  // const twitterUserId = userTwitter.id_str;

  // // check if this twitter account was already claimed
  // const twitterIdCount = await User.find({ 'twitter.id': twitterUserId }).countDocuments();

  // if (twitterIdCount !== 0) {
  //   throw {
  //     status: statusCodes.BAD_REQUEST,
  //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
  //     description: 'Another user already claimed that Twitter account',
  //   };
  // }

  // // check if user following our account
  // const houseTwitterAccount = await request.post({
  //   uri: 'https://api.twitter.com/1.1/users/show.json',
  //   qs: {
  //     user_id: config.app.twitterAccountId,
  //   },
  //   oauth: twitterOauth,
  //   json: true,
  // });

  // console.log(houseTwitterAccount);

  // if (houseTwitterAccount.following !== true) {
  //   throw {
  //     status: statusCodes.BAD_REQUEST,
  //     message: statusCodes.getStatusText(statusCodes.BAD_REQUEST),
  //     description: 'User has not followed twitter account',
  //   };
  // }

  // everything is fine, save to db
  await user.update({
    $inc: { balance: TWITTER_REWARD },
    $set: {
      // 'twitter.id': twitterUserId,
      "rewards.twitter.claimed": true
    },
    $unset: { "twitter.oauth_token": 1, "twitter.oauth_token_secret": 1 }
  });
  globalEvent.emit("socket.emit", {
    eventName: "user.balance",
    userId,
    balance: user.balance,
    message: `$${TWITTER_REWARD} added to your account.`
  });

  return;
}

module.exports = {
  initTwitterClaiming,
  claimTwitter,
};
