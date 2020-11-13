const Joi = require("joi");
const router = require("express").Router();

const config = require("../../config");
const { utils, statusCodes } = require("../helpers");
const { userTypes, sortDirections } = require("../constants");
const { UserModule, SocketModule } = require("../modules");
const { validate, isAuthenticated, has } = require("../middleware");
const { passport } = require("../modules/auth");
const logger = require("../modules/logger");
const MODULE_NAME = "USERS";
const { translate } = require('../i18n');
const { errorMaker } = require('../helpers')

const FRONT_HOST = config.app.frontHost;
const FRONT_PORT = config.app.frontPort;

const userRegisterSchema = {
  username: Joi.string()
    .required()
    .errorTranslate('BAD_REQUEST', 'user.username'),
  email: Joi.string()
    .email()
    .required()
    .errorTranslate('BAD_REQUEST', 'user.email'),
  password: Joi.string()
    .regex(utils.REGEXS.password)
    .required()
    .errorTranslate('BAD_REQUEST', 'user.invalidPassword'),
  profileImageUrl: Joi.string()
    .required()
    .errorTranslate('BAD_REQUEST', 'user.profileImage')
};

const userLoginSchema = {
  email: Joi.string().email()
    .errorTranslate('BAD_REQUEST', 'user.invalidEmail'),
  username: Joi.string(),
  password: Joi.string()
    .regex(utils.REGEXS.password)
    .required()
    .errorTranslate('BAD_REQUEST', 'user.invalidPassword')
};

const emailVerifySchema = {
  token: Joi.string().required(),
  email: Joi.string()
    .email()
    .required()
    .errorTranslate('BAD_REQUEST', 'validation.email')
};

const forgotPasswordSchema = {
  email: Joi.string()
    .email()
    .required()
    .errorTranslate('BAD_REQUEST', 'validation.email')
};

const resetPasswordSchema = {
  email: Joi.string()
    .email()
    .required()
    .errorTranslate('BAD_REQUEST', 'validation.email'),
  resetToken: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'user.resetToken'),
  newPassword: Joi.string().required()
    .errorTranslate('BAD_REQUEST', 'user.newPassword')
};

const updateUserSchema = {
  name: Joi.string(),
  username: Joi.string(),
  tosApproved: Joi.boolean(),
  profileImageUrl: Joi.string()
};

const changePasswordSchema = {
  oldPassword: Joi.string()
    .required()
    .errorTranslate('BAD_REQUEST', 'user.oldPassword'),
  newPassword: Joi.string()
    .required()
    .errorTranslate('BAD_REQUEST', 'user.newPassword')
};

const deactivateSchema = {
  users: Joi.array()
    .items(Joi.string())
    .required()
    .errorTranslate('BAD_REQUEST', 'user.userNotFound')
};

const userAuthenticateSchema = {
  provider: Joi.string().valid("local", "google", "steam"),

  password: Joi.when('provider', {
    is: 'local',
    then: Joi.string().required()
      .errorTranslate('BAD_REQUEST', 'user.password')
  }),
  email: Joi.when('provider', {
    is: 'local',
    then: Joi.string().email().required()
      .errorTranslate('BAD_REQUEST', 'withdrawal.email')
  }),

  idToken: Joi.when("provider", {
    is: "google",
    then: Joi.string().required()
      .errorTranslate('BAD_REQUEST', 'user.googleToken')
  }),

  token: Joi.when("provider", {
    is: "steam",
    then: Joi.string().required()
      .errorTranslate('BAD_REQUEST', 'user.steamToken')
  })
};

const getUsersSchema = {
  limit: Joi.number().integer().positive(),
  offset: Joi.number()
    .integer()
    .when('limit', {
      is: Joi.exist(),
      then: Joi.exist()
    }),
  sortBy: Joi.string(),
  sortDirection: Joi.string()
    .valid(['asc', 'desc'])
    .when('sortBy', {
      is: Joi.exist(),
      then: Joi.exist()
    }),
  name: Joi.string(),
  userEmail: Joi.string(),
  type: Joi.string()
    .valid(Object.values(userTypes))  
};

const muteChatSchema = {
  duration: Joi.number()
    .integer()
    .valid([5, 60, 1440, -1])
    .required()
    .errorTranslate('BAD_REQUEST', 'user.invalidDuration'),
  id: Joi.string()
    .required()
    .errorTranslate('BAD_REQUEST', 'user.invalidId')
};

router.get(
  "/",
  validate(getUsersSchema),
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      let { limit, offset, sortBy, sortDirection, ...query } = req.query;
      const __query = { query };

      if (query.name) {
        query.$text = { $search: query.name };
        query.username = new RegExp(query.name, "i");
        delete query.name;
      }
      
      if (query.userEmail) {
        query.$text = { $search: query.userEmail };
        query.email = new RegExp(query.userEmail, "i");
        delete query.userEmail;
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
      const data = await UserModule.getUsers(__query);

      return utils.sendResponse(res, data);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post("/", validate(userRegisterSchema), async (req, res, next) => {
  try {
    const payload = req.body;

    let response = await UserModule.register({ ...payload, testing: req.isTest }, req.translate);

    return utils.sendResponse(res, response);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.post(
  "/deactivate",
  validate(deactivateSchema),
  async (req, res, next) => {
    try {
      const { users } = req.body;

      let response = await UserModule.disableUsers(users);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/authenticate/email",
  validate(userLoginSchema),
  async (req, res, next) => {
    try {
      const payload = req.body;

      if (!payload.email && !payload.username) {
        return utils.sendResponse(res, errorMaker(statusCodes.BAD_REQUEST, req.translate('user.email')));
      }

      let response = await UserModule.login(payload, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get(
  "/verify-email",
  validate(emailVerifySchema),
  async (req, res, next) => {
    try {
      const payload = req.query;

      let response = await UserModule.verifyEmail(payload, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get(
  "/forgot-password",
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const payload = req.query;

      let response = await UserModule.forgotPassword(payload, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const payload = req.body;

      let response = await UserModule.resetPassword(payload, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get("/info", isAuthenticated, async (req, res, next) => {
  try {
    const payload = Object.assign(req.body, { userId: req.token.id });

    const response = await UserModule.getUserInfo(payload, req.translate);

    return utils.sendResponse(res, response);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.get("/ips", isAuthenticated, async (req, res, next) => {
  try {

    let { limit, offset, sortBy, sortDirection, ...query } = req.query;
    const __query = { query };

    if (query.search) {
      query.ip = new RegExp(query.search, "i");
      delete query.search;
    }
    
    if (limit && offset) {
      __query.pagination = {
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    }
    if (sortBy && sortDirection) {
      if (sortBy === 'ip'){
        sortBy = '_id'
      }
      __query.sort = { [sortBy]: sortDirections[sortDirection] };
    }

    const response = await UserModule.getIPs(__query);

    return utils.sendResponse(res, response);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.get("/ip-users", async (req, res, next) => {
  try {
    const payload = req.query;;

    const response = await UserModule.getUsersWithIP(payload);

    return utils.sendResponse(res, response);
  } catch (error) {
    return utils.sendResponse(res, error);
  }
});

router.put(
  "/update-info",
  [validate(updateUserSchema), isAuthenticated],
  async (req, res, next) => {
    try {
      const payload = Object.assign(req.body, { userId: req.token.id });

      const response = await UserModule.updateUser(payload, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get("/online", (req, res) => {
  const userIds = SocketModule.getOnlineUsers();

  return utils.sendResponse(res, userIds.length);
});

router.get("/online-ids", (req, res) => {
  const token = req.get("x-socket-token");
  if (!token || token !== config.app.socketToken) {
    return res.json({ success: false });
  }

  const userIds = SocketModule.getOnlineUsers();

  return utils.sendResponse(res, userIds);
});


router.get(
  "/:id",
  isAuthenticated,
  has(userTypes.Admin),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      let { limit, offset, sortBy, sortDirection, ...query } = req.query;
      const __query = { query };

      if (limit && offset) {
        __query.pagination = {
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
      }
      if (sortBy && sortDirection) {
        __query.sort = { [sortBy]: sortDirections[sortDirection] };
      }

      const data = await UserModule.getUserDetail(id, __query.pagination, __query.sort);

      return utils.sendResponse(res, data);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);


router.put(
  "/:id",
  [isAuthenticated, has(userTypes.Admin)],
  async (req, res, next) => {
    try {
      const payload = Object.assign(req.body, { userId: req.params.id });

      const response = await UserModule.updateUser(payload, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.put(
  "/change-password",
  [validate(changePasswordSchema), isAuthenticated],
  async (req, res, next) => {
    try {
      const payload = Object.assign(req.body, { userId: req.token.id });

      const response = await UserModule.changePassword(payload, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.post(
  "/authenticate/google",
  validate(userAuthenticateSchema),
  async (req, res, next) => {
    try {
      const payload = req.body;

      const response = await UserModule.loginUsingGoogle(payload, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get(
  "/authenticate/steam",
  passport.authenticate("steam", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/");
  }
);

router.get(
  "/authenticate/steam/return",
  passport.authenticate("steam", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      const result = await UserModule.authenticateUserWithSteam(res.req.user);

      res.redirect(
        `http://${FRONT_HOST}:${FRONT_PORT}/auth/steam-return?token=${result.token}`
      );
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get(
  "/authenticate/opskins",
  passport.authenticate("opskins", { failureRedirect: "/" }),
  (req, res) => res.redirect("/")
);

router.get(
  "/authenticate/opskins/return",
  passport.authenticate("opskins", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      const result = await UserModule.authenticateUserWithOpskins(res.req.user);

      res.redirect(
        `http://${FRONT_HOST}:${FRONT_PORT}/auth/opskins-return?token=${result.token}`
      );
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get(
  "/:id/block",
  [validate(muteChatSchema), isAuthenticated, has(userTypes.Admin)],
  async (req, res, next) => {
    try {
      const { duration } = req.query;
      const { id } = req.params;

      const response = await UserModule.muteChat(id, duration, req.translate);

      return utils.sendResponse(res, response);
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

router.get(
  "/authenticate/fb",
  passport.authenticate("facebook", { scope: ['email'], failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/");
  }
);

router.get(
  "/authenticate/fb/return",
  passport.authenticate("facebook", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      const result = await UserModule.authenticateUserWithFB(req.user);
      res.redirect(
        `https://${FRONT_HOST}/account?token=${result.token}&destination=/`
      );
    } catch (error) {
      return utils.sendResponse(res, error);
    }
  }
);

module.exports = router;
