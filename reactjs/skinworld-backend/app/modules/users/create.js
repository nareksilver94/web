const bcrypt = require("bcrypt");
const { omit } = require("lodash");
const shortId = require("short-id");

const User = require("../../models/user");
const { statusCodes, errorMaker } = require("../../helpers");
const { issueToken } = require("../auth");
const { sendEmail } = require("../email");
const { translate } = require('../../i18n');
const globalEvent = require('../event');
const {
  emailTemplateTypes,
  userStatuses,
  userTypes
} = require("../../constants");
const config = require("../../../config");

const unAllowedUserFields = [
  "password",
  "emailVerificationToken",
  "passwordResetToken",
  "promocodes",
  "ip"
];


const register = async (payload, translate) => {
  try {
    payload.email = payload.email.toLowerCase();
    payload.username = payload.username.toLowerCase();

    let [userByEmail, userByUsername] = await Promise.all([
      User.findOne({ email: payload.email }),
      User.findOne({ username: payload.username })
    ]);

    // user with same email found in db
    if (userByEmail) {
      // if (userByEmail.google && !userByEmail.password && userByEmail.status !== userStatuses.Disabled) {
      //   // already registered with google, no password found and not blocked
      //   const password = payload.password;

      //   payload = userByEmail;
      //   payload.password = password;
      // } else
      if (userByEmail.google) {
        throw errorMaker(statusCodes.NOT_ACCEPTABLE, translate('user.useGoogle'));
      } else {
        throw errorMaker(statusCodes.NOT_ACCEPTABLE, translate('user.emailExists'));
      }
    }

    if (userByUsername) {
      throw errorMaker(statusCodes.NOT_ACCEPTABLE, translate('user.nameExists'));
    }
    payload.password = bcrypt.hashSync(payload.password, 10);
    payload.status = userStatuses.Pending;
    payload.emailVerificationToken = shortId.generate();

    payload.profileImageUrl = `https://${
      config.app.frontHost
    }/assets/images/profile/male-${Math.ceil(Math.random() * 30)}.svg`;

    // update existing user or create new one
    let user =
      payload instanceof User
        ? await payload.save()
        : await User(payload).save();
    let token = await issueToken({
      id: user._id,
      type: userTypes.User,
      email: user.email
    });

    // const link = `https://${config.app.host}/v1/users/verify-email?email=${user.email}&token=${user.emailVerificationToken}`;
    // const emailParams = {
    //   destinations: user.email,
    //   subject: "Welcome to Lootie",
    //   type: emailTemplateTypes.Html,
    //   name: "verify",
    //   data: {
    //     link,
    //     username: user.username
    //   }
    // };

    // if (process.env.ENV !== 'dev') {
    // sendEmail(emailParams);
    // }

    delete user.password;
    delete user.emailVerificationToken;

    // tracking
    globalEvent.emit("socket.emit", {
      eventName: "ga",
      isSingle: true,
      userId: user._id,
      event: 'Signup',
      signUpMethod: 'Email'
    });

    return {
      user: omit(user.toObject(), unAllowedUserFields),
      token
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  register
};
