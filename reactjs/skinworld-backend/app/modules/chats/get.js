const Message = require("../../models/message");
const Room = require("../../models/room");

const getMessages = roomId => {
  return Message.find({ room: roomId })
    .populate({
      path: "sender",
      select: "username email profileImageUrl status"
    })
    .sort("-createdAt")
    .limit(20)
    .lean()
    .then(docs => docs.reverse());
};

const getRooms = (userId, workSpaceId) => {
  let query = { participants: userId };
  if (workSpaceId) query.workSpaceId = workSpaceId;

  return Room.find(query)
    .populate("participants")
    .then(docs => docs.map(doc => doc.toObject()));
};

module.exports = {
  getMessages,
  getRooms
};
