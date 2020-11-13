const createChatsModule = require("./create");
const getChatsModule = require("./get");
const deleteChatsModule = require("./delete");

module.exports = {
  ...createChatsModule,
  ...getChatsModule,
  ...deleteChatsModule
};
