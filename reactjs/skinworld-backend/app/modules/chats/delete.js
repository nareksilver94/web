const mongoose = require("mongoose");
const Message = require("../../models/message");
const { statusCodes, errorMaker } = require("../../helpers");

const deleteMessage = async (messageId, translate) => {
  try {
    const message = await Message.findById(messageId);

    if (!message) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('chats.messageNotExist'));
    }

    const result = await message.remove();

    return;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  deleteMessage
};
