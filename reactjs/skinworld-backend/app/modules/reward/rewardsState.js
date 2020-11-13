const User = require("../../models/user");

async function getRewardsState(userId) {
  const user = await User.findById(userId);

  return user.reward;
}

module.exports = {
  getRewardsState,
};

