const mongoose = require("mongoose");
const Case = require("../../models/case");
const CaseItem = require("../../models/case-item");
const { validateCasePayload } = require("./helpers");
const { caseTypes } = require("../../constants");
const { statusCodes, errorMaker, utils } = require("../../helpers");

const createCase = async (payload, translate) => {
  const isImageValid = await utils.checkFileUrl(payload.image);
  if (!isImageValid) {
    throw errorMaker(statusCodes.BAD_REQUEST, translate('validation.invalidImage'));
  }
  
  const session = await mongoose.startSession();

  try {
    let resp;

    await session.withTransaction(async () => {
      const caseItemsResult = await CaseItem.insertMany(payload.items, {
        session
      });

      payload = await validateCasePayload(payload, false, translate);
      payload.items = caseItemsResult.map(v => v._id);
      payload.caseTypes = [caseTypes.NEW_CASE];

      const result = await Case.create([payload], { session });

      resp = result;
    });

    return resp;
  } catch (err) {
    throw err;
  } finally {
    session.endSession();
  }
};

module.exports = {
  createCase
};
