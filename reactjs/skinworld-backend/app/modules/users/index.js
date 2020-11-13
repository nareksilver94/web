const createUserModule = require("./create");
const getUserModule = require("./get");
const updateUserModule = require("./update");

module.exports = {
  ...createUserModule,
  ...getUserModule,
  ...updateUserModule
};
