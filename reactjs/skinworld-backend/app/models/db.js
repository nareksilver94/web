const mongoose = require("mongoose");
const config = require("../../config");
const logger = require("../modules/logger");

const CaseOpening = require('./case-opening.js');
const RewardCode = require('./rewardcode.js');
const Transaction = require('./transaction.js');
const UserItem = require('./user-item.js');
const CaseItem = require('./case-item.js');
const Case = require('./case.js');
const Giftcard = require('./giftcard.js');
const Dice = require('./dice.js');
const Upgrade = require('./upgrade.js');
const Withdrawal = require('./withdrawal.js');
const Battle = require('./battle');

mongoose.Promise = Promise;

async function connect() {
  try {
    logger.info(`Establishing mongodb connection...`);

    let dbUrl = config.db.url;
    let options = {
      useCreateIndex: true,
      useNewUrlParser: true,
      useFindAndModify: false
    };

    if (!dbUrl) {
      dbUrl = `mongodb://${config.db.user}:${config.db.pass}@${config.db.host}:${config.db.port}/${config.db.name}`;
    }
    if (config.db.user && config.db.pass && !config.db.url) {
      options["user"] = config.db.user;
      options["pass"] = config.db.pass;
      options["dbName"] = config.db.name;
    }

    await mongoose.connect(dbUrl, options);
    mongoose.set({ debug: true });
    logger.info(`Mongodb connection established`);
  } catch (error) {
    logger.error(`Mongodb connection error = ${error}`);
  }
}

async function createCollections() {
  // create(/ensure they are exists) all collections
  await CaseOpening.createCollection();
  await RewardCode.createCollection();
  await Transaction.createCollection();
  await UserItem.createCollection();
  await CaseItem.createCollection();
  await Case.createCollection();
  await Giftcard.createCollection();
  await Dice.createCollection();
  await Upgrade.createCollection();
  await Withdrawal.createCollection();
  await Battle.createCollection();
}

module.exports = {
  connect,
  createCollections,
};
