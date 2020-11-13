const mongoose = require("mongoose");
const Case = require("../../models/case");
const { statusCodes } = require("../../helpers");

const disableCase = async (caseId, userId) => {
  const query = { _id: mongoose.Types.ObjectId(caseId) };
  if (userId) {
    query.userId = mongoose.Types.ObjectId(userId);
  }
  const result = await Case.updateOne(query, { $set: { isDisabled: true } });

  return;
};

const enableCase = async (caseId, userId) => {
  const query = { _id: mongoose.Types.ObjectId(caseId) };
  if (userId) {
    query.userId = mongoose.Types.ObjectId(userId);
  }
  const result = await Case.updateOne(query, { $set: { isDisabled: false } });

  return;
};

module.exports = {
  disableCase,
  enableCase
};
