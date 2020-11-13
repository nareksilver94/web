const User = require("../../models/user");
const Message = require("../../models/message");
const Room = require("../../models/room");
const { statusCodes, errorMaker } = require("../../helpers");

const saveMessage = (payload, translate) => {
  let sender = null;

  return User.findById(payload.sender)
    .select("username email profileImageUrl")
    .then(doc => {
      if (!doc) {

        return Promise.reject(
          errorMaker(statusCodes.BAD_REQUEST, translate('chats.senderNotExist'))
        );
      } else {
        sender = doc.toObject();
      }
    })
    .then(() => new Message(payload).save())
    .then(result => Object.assign({}, result.toObject(), { sender }));
};

const saveRoom = (payload, translate) => {
  return User.count({ _id: { $in: payload.participants } })
    .then(result => {
      if (result !== payload.participants.length) {
        return Promise.reject(
          errorMaker(statusCodes.BAD_REQUEST, translate('chats.InvalidParticipantId'))
        );
      }
    })
    .then(() => new Room(payload).save());
};

module.exports = {
  saveMessage,
  saveRoom
};
