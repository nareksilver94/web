const createModule = require("./create");
const getModule = require("./get");
const updateModule = require("./update");
const deleteModule = require("./delete");

module.exports = {
  ...createModule,
  ...getModule,
  ...updateModule,
  ...deleteModule
};
