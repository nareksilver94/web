// grab the mongoose module
const mongoose = require("mongoose");
const Message = require("./message");
const logger = require("../modules/logger.js");

const roomSchema = mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Types.ObjectId,
        ref: "users"
      }
    ],
    name: String
  },
  {
    timestamps: true,
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

roomSchema.index({ participants: 1 });

roomSchema.pre("remove", async function(next) {
  await Message.remove({ room: this._id });
  next();
});

const Room = mongoose.model("rooms", roomSchema);

Room.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for Room model, err: ${err}`);
  }
});

module.exports = Room;
