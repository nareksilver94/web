const Joi = require("joi");
const router = require("express").Router();
const { translate } = require('../i18n');
const { errorMaker, utils } = require('../helpers');
const { userTypes } = require("../constants");

const { ChatModule } = require("../modules");
const { validate, isAuthenticated, has } = require("../middleware");

const roomRegisterSchema = {
  name: Joi.string()
    .allow("")
    .optional(),
  participants: Joi.array().required()
    .errorTranslate('BAD_REQUEST', 'chats.participants'),
};

router.get("/:roomId/messages", (req, res, next) => {
  const roomId = req.params.roomId;

  ChatModule.getMessages(roomId)
    .then(result => utils.sendResponse(res, result))
    .catch(err => utils.sendResponse(res, err));
});

router.delete(
  "/:roomId/messages/:messageId",
  isAuthenticated,
  has(userTypes.Admin),
  (req, res, next) => {
  const messageId = req.params.messageId;

  ChatModule.deleteMessage(messageId, req.translate)
    .then(result => utils.sendResponse(res, result))
    .catch(err => utils.sendResponse(res, err));
  }
);

router.get("/", isAuthenticated, (req, res, next) => {
  const userId = req.token.id;

  ChatModule.getRooms(userId)
    .then(result => utils.sendResponse(res, result))
    .catch(err => utils.sendResponse(res, err));
});

router.post(
  "/",
  isAuthenticated,
  validate(roomRegisterSchema),
  (req, res, next) => {
    const payload = req.body;

    ChatModule.saveRoom(payload, req.translate)
      .then(result => utils.sendResponse(res, result))
      .catch(err => utils.sendResponse(res, err));
  }
);

module.exports = router;
