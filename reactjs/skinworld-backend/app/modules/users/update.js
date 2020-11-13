const bcrypt = require("bcrypt");
const { omit } = require("lodash");
const shortId = require("short-id");
const mongoose = require("mongoose");

const User = require("../../models/user");
const { statusCodes, errorMaker } = require("../../helpers");
const { issueToken, verifyGoogleIdTokenAndReturnPayload } = require("../auth");
const Transaction = require("../../models/transaction");
const { sendEmail } = require("../email");
const {
  emailTemplateTypes,
  userStatuses,
  transactionTypes,
  depositTypes
} = require("../../constants");
const config = require("../../../config");
const logger = require("../logger");
const { translate } = require("../../i18n");
const redis = require("../redis");
const MODULE_NAME = "USER_UPDATE";
const globalEvent = require("../event");

const unAllowedUserFields = [
  "password",
  "emailVerificationToken",
  "passwordResetToken",
  "promocodes",
  "ip"
];

const verifyEmail = async (payload, translate) => {
  try {
    payload.email = payload.email.toLowerCase();

    let filter = {
      email: payload.email
    };

    let user = await User.findOne(filter).lean();
    if (!user) {
      throw errorMaker(statusCodes.NOT_FOUND, translate("user.emailNotFound"));
    }

    if (!user.emailVerificationToken || user.status !== userStatuses.Pending) {
      return {
        message: translate("user.emailVerified")
      };
    }

    if (user.emailVerificationToken !== payload.token) {
      throw errorMaker(statusCodes.NOT_ACCEPTABLE, translate("user.invalidToken"));
    }

    let update = {
      emailVerificationToken: null,
      status: userStatuses.Offline
    };

    user = await User.findOneAndUpdate(filter, update, {
      new: true,
      lean: true
    });

    return {
      message: translate("user.emailVerifySuccess")
    };
  } catch (error) {
    throw error;
  }
};

const forgotPassword = async (payload, translate) => {
  try {
    payload.email = payload.email.toLowerCase();

    let filter = {
      email: payload.email
    };

    let user = await User.findOne(filter).lean();
    if (!user) {
      throw errorMaker(statusCodes.NOT_FOUND, translate("user.emailNotFound"));
    }

    const update = {
      passwordResetToken: shortId.generate()
    };
    user = await User.findOneAndUpdate(filter, update, {
      new: true,
      lean: true
    });

    const link = `https://${config.app.frontHost}/reset-password?token=${user.passwordResetToken}&email=${payload.email}`;
    const emailParams = {
      destinations: user.email,
      subject: "Forgot Password",
      type: emailTemplateTypes.Html,
      name: "forgot",
      data: { link },
      source: 'forgot-password',
    };
    sendEmail(emailParams);

    return {
      message: translate("user.resetPassEmailSent", {
        email: payload.email
      })
    };
  } catch (error) {
    throw error;
  }
};

const resetPassword = async (payload, translate) => {
  try {
    payload.email = payload.email.toLowerCase();

    let filter = {
      email: payload.email
    };

    let user = await User.findOne(filter).lean();
    if (!user) {
      throw errorMaker(statusCodes.NOT_FOUND, translate("user.userNotFound"));
    }

    if (user.passwordResetToken !== payload.resetToken) {
      throw errorMaker(statusCodes.NOT_FOUND, translate("user.invalidToken"));
    }

    if (
      user.password &&
      bcrypt.compareSync(payload.newPassword, user.password)
    ) {
      throw errorMaker(statusCodes.NOT_ACCEPTABLE, translate("user.passwordEqual"));
    }

    const update = {
      passwordResetToken: null,
      password: bcrypt.hashSync(payload.newPassword, 10)
    };
    user = await User.findOneAndUpdate(filter, update, {
      new: true,
      lean: true
    });

    const emailParams = {
      destinations: user.email,
      subject: "Password changed successfully",
      type: emailTemplateTypes.Html,
      name: "reset",
      data: { username: user.username },
      source: 'reset-password',
    };
    sendEmail(emailParams);

    return {
      message: translate("user.passwordResetSuccess")
    };
  } catch (error) {
    throw error;
  }
};

const updateUser = async (payload, translate) => {
  try {
    let filter = {
      _id: payload.userId
    };

    delete payload.userId;

    let user = await User.findOne(filter).lean();
    if (!user) {
      throw errorMaker(statusCodes.NOT_FOUND, translate("user.userNotFound"));
    }

    if (payload.username) {
      let checkUsername = await User.findOne({
        _id: { $ne: filter._id },
        username: payload.username
      }).lean();

      if (checkUsername) {
        throw errorMaker(statusCodes.NOT_ACCEPTABLE, translate("user.nameExists"));
      }
    }

    if (payload.newBalance) {
      let newBalance = Number(payload.newBalance);
      let balance = user.balance;
      let deposited = user.depositedValue;
      const username = user.username;

      balance = newBalance;
      deposited = newBalance;

      await new Transaction({
        value: newBalance,
        transactionType: transactionTypes.Deposit,
        subType: depositTypes.Other,
        user: user._id
      }).save();

      payload.balance = balance;
      payload.depositedValue = deposited;

      globalEvent.emit("socket.emit", {
        eventName: "user.balance",
        userId: user._id,
        balance,
        deposited,
        message: `Current balance is $${balance}`
      });
    }

    if (payload.newPassword) {
      payload.password = bcrypt.hashSync(payload.newPassword, 10);
    }

    user = await User.findOneAndUpdate(filter, payload, {
      new: true,
      lean: true
    });

    return omit(user, unAllowedUserFields);
  } catch (error) {
    throw error;
  }
};

const changePassword = async (payload, translate) => {
  try {
    const filter = {
      _id: payload.userId
    };

    let user = await User.findOne(filter).lean();
    if (!user) {
      throw errorMaker(statusCodes.NOT_FOUND, translate("user.userNotFound"));
    }
    if (!bcrypt.compareSync(payload.oldPassword, user.password)) {
      throw errorMaker(statusCodes.NOT_ACCEPTABLE, translate("user.invalidPassword"));
    }
    if (bcrypt.compareSync(payload.newPassword, user.password)) {
      throw errorMaker(statusCodes.NOT_ACCEPTABLE, translate("user.passwordEqual"));
    }

    const update = {
      password: bcrypt.hashSync(payload.newPassword, 10)
    };
    user = await User.findOneAndUpdate(filter, update, {
      new: true,
      lean: true
    });

    return {
      message: translate("user.passwordChangeSuccess")
    };
  } catch (error) {
    throw error;
  }
};

const loginUsingGoogle = async (payload, translate) => {
  try {
    const googlePayload = await verifyGoogleIdTokenAndReturnPayload(
      payload.idToken
    );
    if (!googlePayload) {
      throw errorMaker(statusCodes.UNAUTHORIZED, translate("global.serverError"));
    }

    let user = await User.findOne({ email: googlePayload.email }).lean();
    const isNewUser = !user || !user.google;

    if (!user) {
      // can't find user in db, create new record
      user = await User({
        email: googlePayload.email,
        profileImageUrl: googlePayload.picture,
        username: googlePayload.name,
        name: googlePayload.given_name,
        google: {
          id: googlePayload.sub,
          token: payload.idToken
        }
      }).save();

      user = user.toObject();
    } else {
      // user already exists, add google data if neccesary
      if (user.status === userStatuses.Disabled) {
        throw errorMaker(statusCodes.FORBIDDEN, translate('user.banned'));
      }
      if (!user.google) {
        user = await User({
          ...user,
          google: {
            id: googlePayload.sub,
            token: payload.idToken
          }
        }).save();

        user = user.toObject();
      }
    }

    const token = await issueToken({
      id: user._id,
      type: user.type,
      email: user.email
    });

    // tracking
    if (isNewUser) {
      globalEvent.emit("socket.emit", {
        eventName: "ga",
        isSingle: true,
        userId: user._id,
        event: "Signup",
        signUpMethod: "Google"
      });
    }

    const totalReferralInfo = await User.aggregate([
      {
        $match: { referredBy: user._id }
      },
      {
        $group: {
          _id: null,
          deposited: { $sum: '$depositedValue' },
        }
      }
    ]);

    user.referralDeposited = totalReferralInfo && totalReferralInfo.length
      ? totalReferralInfo[0].deposited
      : 0;

    return {
      user: omit(user, unAllowedUserFields),
      token
    };
  } catch (error) {
    throw error;
  }
};

const authenticateUserWithSteam = steamPayload => {
  return User.findOne({ "steam.id": steamPayload.id })
    .then(foundUser => {
      if (foundUser) {
        return foundUser;
      }
      // Create user if doesn't exist
      const newUser = new User({
        profileImageUrl: steamPayload._json.avatar,
        username: steamPayload.displayName,
        name: steamPayload._json.realname,
        steam: {
          id: steamPayload.id
        }
      });

      return newUser.save();
    })
    .then(mongoUser => {
      userObj = mongoUser.toObject();

      const tokenPayload = {
        id: userObj._id.toString(),
        type: userObj.type,
        email: userObj.email
      };

      return issueToken(tokenPayload);
    })
    .then(token => {
      return {
        user: omit(userObj, unAllowedUserFields),
        token
      };
    });
};

const authenticateUserWithOpskins = opskinsPayload => {
  return User.findOne({ "opskins.id": opskinsPayload.id })
    .then(foundUser => {
      if (foundUser) {
        return foundUser;
      }
      // Create user if doesn't exist
      const newUser = new User({
        profileImageUrl: opskinsPayload.avatar,
        username: opskinsPayload.username,
        name: opskinsPayload.name
          ? `${opskinsPayload.name.first} ${opskinsPayload.name.last}`
          : "",
        opskins: {
          id: opskinsPayload.id,
          token: opskinsPayload.access.access_token,
          refreshToken: opskinsPayload.access.refresh_token,
          secret: opskinsPayload.access.code
        }
      });

      return newUser.save();
    })
    .then(mongoUser => {
      userObj = mongoUser.toObject();

      const tokenPayload = {
        id: userObj._id.toString(),
        type: userObj.type,
        email: userObj.email
      };

      return issueToken(tokenPayload);
    })
    .then(token => {
      return {
        user: omit(userObj, unAllowedUserFields),
        token
      };
    });
};

const authenticateUserWithFB = async (fbPayload) => {
  try {
    let user = await User.findOne({
      email: fbPayload._json.email,
    });

    if (user === null) {
      // user with such email don't exists in db, create
      user = await User({
        email: fbPayload._json.email,
        profileImageUrl:
        "https://graph.facebook.com/" + fbPayload.id + "/picture",
        username: fbPayload._json.email,
        name: fbPayload._json.first_name + fbPayload._json.last_name,
        facebook: {
          id: fbPayload.id
        },
      }).save();
    }
    else {
      // user already exists 
      if (user.status === userStatuses.Disabled) {
        throw errorMaker(statusCodes.FORBIDDEN, translate('user.banned'));
      }

      // if ('facebook' in user === false || user.facebook.id === void 0) {
        // add facebook data if neccesary
        user.facebook = {
          id: fbPayload.id,
        };

        await user.save();
      // }

      user = user.toObject();
    }

    const tokenPayload = {
      id: user._id.toString(),
      type: user.type
    };
    const token = await issueToken(tokenPayload);

    const totalReferralInfo = await User.aggregate([
      {
        $match: { referredBy: user._id }
      },
      {
        $group: {
          _id: null,
          deposited: { $sum: '$depositedValue' },
        }
      }
    ]);

    user.referralDeposited = totalReferralInfo && totalReferralInfo.length
      ? totalReferralInfo[0].deposited
      : 0;

    return {
      user: omit(user, unAllowedUserFields),
      token
    };
  } catch (error) {
    throw error;
  }
};

const disableUsers = async userIds => {
  try {
    logger.info("Disable users", { userIds, MODULE_NAME });
    const users = await User.find({ _id: { $in: userIds } }).select('ip');

    users.forEach(user => {
      if (user.ip) {
        const banIpKey = redis.getKey('BAN_IP_PREFIX', user.ip);
        redis.set(banIpKey, userStatuses.Disabled)
      }
    });
    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { status: userStatuses.Disabled } }
    );

    return userIds;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  updateUser,
  authenticateUserWithSteam,
  authenticateUserWithOpskins,
  authenticateUserWithFB,
  verifyEmail,
  forgotPassword,
  resetPassword,
  updateUser,
  changePassword,
  loginUsingGoogle,
  disableUsers
};
