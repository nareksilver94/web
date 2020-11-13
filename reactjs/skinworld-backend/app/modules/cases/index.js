const createModule = require("./create");
const getModule = require("./get");
const deleteModule = require("./delete");
const updateModule = require("./update");
const helpers = require("./helpers");

module.exports = {
  ...createModule,
  ...getModule,
  ...updateModule,
  ...deleteModule,
  helpers
};
