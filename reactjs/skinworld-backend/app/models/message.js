// grab the mongoose module
const mongoose = require("mongoose");
const logger = require("../modules/logger.js");

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Types.ObjectId,
      ref: "rooms"
    },
    sender: {
      type: mongoose.Types.ObjectId,
      ref: "users"
    },
    text: String
  },
  {
    timestamps: true,
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

messageSchema.index({ createdAt: -1 });
messageSchema.index({ room: 1 });

const Message = mongoose.model("messages", messageSchema);

Message.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for Message model, err: ${err}`);
  }
});

module.exports = Message;
