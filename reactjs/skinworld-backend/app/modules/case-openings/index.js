const createModule = require("./create");
const getModule = require("./get");
const updateModule = require("./update");

module.exports = {
  ...createModule,
  ...getModule,
  ...updateModule
};
