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

async function claimDiscord(userId, accessToken, translate) {
  const DISCORD_REWARD = 0.5;
  const user = await User.findById(userId);

  if (user.rewards.discord.claimed === true) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('reward.rewardClaimed'));
  }

  // get discord id
  const discordUserId = await request({
    uri: "https://discordapp.com/api/v6/users/@me",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    json: true
  })
    .then(res => {
      if (res.id !== void 0) {
        return res.id;
      }

      return false;
    })
    .catch(err => {
      return false;
    });

  if (discordUserId === false) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('reward.wrongAccessToken'));
  }

  const discordIdCount = await User.find({
    "discord.id": discordUserId
  }).countDocuments();

  if (discordIdCount !== 0) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('reward.claimedDiscord'));
  }

  // check if user joined our guild(aka server)
  const discordGuilds = await request({
    uri: "https://discordapp.com/api/v6/users/@me/guilds",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    json: true
  }).catch(err => {
    return false;
  });

  const isUserJoined = discordGuilds.some(
    guild => guild.id === config.app.discordGuildId
  );

  if (isUserJoined === false) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('reward.notJoinDiscordServer'));
  }

  // update db
  await user.update({
    $inc: { balance: DISCORD_REWARD },
    $set: {
      "rewards.discord.claimed": true,
      "discord.id": discordUserId
    }
  });
  globalEvent.emit("socket.emit", {
    eventName: "user.balance",
    userId,
    balance: user.balance,
    message: `$${DISCORD_REWARD} added to your account.`
  });

  return;
}

module.exports = {
  claimDiscord,
};
