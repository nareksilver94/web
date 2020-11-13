const Upgrade = require("../../models/upgrade");
const logger = require("../logger");

const deleteUpgrade = async (user, id) => {
  try {
    const result = await Upgrade.findOne({
      _id: id,
      user
    });

    if (result) {
      await result.remove();
    }

    return result;
  } catch (error) {
    logger.error("Delete case opening", { MODULE_NAME, error });
  }
};

module.exports = {
  deleteUpgrade
};
