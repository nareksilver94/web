const Promocode = require("../../models/promocode");
const User = require("../../models/user");
const { statusCodes, errorMaker } = require("../../helpers");
const { translate } = require('../../i18n');

const validateCode = async (userId, code, translate) => {
  try {
    const user = await User.findById(userId)
      .populate("promocodes")
      .select("promocodes");

    if (!user) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('user.userNotFound'));
    }
    if (!user.promocodes) {
      user.promocodes = [];
      await user.save();
    }
    if (user.promocodes.some(v => v.code.toLowerCase() === code.toLowerCase())) {
      throw errorMaker(statusCodes.OK, translate('deposit.activatedCode'));
    }

    const codeCount = await Promocode.findOne({ code: new RegExp(`^${code}$`, 'i') }).countDocuments();
    if (codeCount === 0) {
      throw errorMaker(statusCodes.BAD_REQUEST, translate('deposit.invalidCode'));
    }

    return;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  validateCode
};
