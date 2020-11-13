const mongoose = require("mongoose");
// const logger = require("../app/modules/logger.js");
const config = require("../config");
const stats = require("stats-lite");
const {
  generateRandomHexString,
  asyncWait,
} = require("../app/helpers/utils.js");
const rp = require('request-promise-native');
const bcrypt = require("bcrypt");
const { issueToken } = require("../app/modules/auth");
const User = require("../app/models/user");
const Dice = require("../app/models/dice");
const Case = require("../app/models/case");
const CaseOpening = require("../app/models/case-opening");
const CaseStatistics = require("../app/models/case-statistics");
const UserStatistics = require("../app/models/user-statistics");
const UserItem = require("../app/models/user-item");
const { userTypes } = require("../app/constants");
const slugify = require("mongoose-slug-generator");

const USERS_NUM = parseInt(process.env.USERS_NUM) || 10;
const BACKEND_URL = process.env.BACKEND_URL;
const ACTIONS = ['register', 'login', 'unbox'];
let testCaseId;

(async () => {
  // randomize actions
  const actions = Object.fromEntries(ACTIONS.map(v => [v, { iterations: 0 }]));
  for (let i = 0; i < USERS_NUM; ++i) {
    const actionName = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    actions[actionName].iterations += 1;
  }

  console.log(`Start tests, action iterations:\n${Object.entries(actions).map(([v, n]) => `${v} - ${n.iterations}`).join('\n')}`);

  await connectToMongo();

  const testCase = await Case.findOne({
    testing: true,
  }).lean();

  if (testCase === void 0 || testCase === null) {
    console.error('Can not find test case(with "testing: true"), exit');
    return process.exit(1);
  }
  else {
    testCaseId = testCase._id.toString();
    console.log(`Test case id is ${testCaseId}`);
  }

  for (const [actionName, action] of Object.entries(actions)) {
    // preapre user objects
    action.users = new Array(action.iterations).fill(null).map(() => {
      const user = new UserTest();
      return user;
    });
  }

  const usersToCreate = Object.entries(actions).reduce((accum, [actionName, { users }]) => {
    // create users in db for all actions except registration
    if (actionName !== 'register') {
      for (const user of users) {
        accum.push({
          username: user.username,
          email: user.email,
          password: bcrypt.hashSync(user.password, 10),
          balance: 105000,
          testing: true,
          // referralCode: user.refCode,
        });
      }
    }

    return accum;
  }, []);

  console.log('Create accounts in mongodb');

  let dbUsers;

  try {
    dbUsers = await User.create(usersToCreate);
  } catch (err) {
    console.error('Error while creating users in db', err);
    process.exit(1);
  }

  dbUsers = Object.fromEntries(dbUsers.map((user) => {
    return [user.username, user];
  }));

  for (const [actionName, action] of Object.entries(actions)) {
    // create tokens for all users except login and register actions
    if (actionName === 'register' || actionName === 'login') {
      continue;
    }

    for (const user of action.users) {
      const dbUser = dbUsers[user.username];

      if (dbUser === void 0) {
        continue;
      }

      user.mongoId = dbUser._id.toString();

      user.token = await issueToken({
        id: dbUser._id,
        type: userTypes.User,
        email: user.email
      });
    }
  }

  console.log('Start actions');

  // do actions
  const actionsPromises = [];
  for (const [actionName, action] of Object.entries(actions)) {
    action.results = [];

    for (const user of action.users) {
      const promise = user[actionName]()
        .then((time) => {
          action.results.push(time);
        })
        .catch((err) => {
          console.log(err);
          action.results.push(err);
        });

      actionsPromises.push(promise);

      // wait up to 200 ms and start next action
      await asyncWait(Math.floor(Math.random() * 200));
    }
  }

  // output results
  await Promise.all(actionsPromises)

  console.log('Actions finished with stats:');

  for (const [actionName, action] of Object.entries(actions)) {
    let failedNum = 0;
    let executionTime = [];

    action.results.forEach((result) => {
      if (result instanceof Error === true) {
        failedNum += 1;
      }
      else {
        executionTime.push(Number(result / BigInt(1e6)));
      }
    });

    console.log(`${actionName}: ${failedNum} fails(out of ${action.users.length}), ${stats.mean(executionTime)}ms mean, ${stats.median(executionTime)}ms median`);
  }

  console.log('Delete testing data from mongodb...');

  const usersIds = [];
  const dicesIds = [];
  const caseOpeningsIds = [];
  const casesIds = [];
  const casesIdsAndProfit = [];

  for (const action of Object.values(actions)) {
    for (const user of action.users) {
      if (user.mongoId !== void 0) {
        usersIds.push(user.mongoId);
      }

      dicesIds.push(...user.dicesIds);
      caseOpeningsIds.push(...user.caseOpeningsIds);
      casesIds.push(...user.casesIds);
      
      if (user.profit !== void 0) {
        casesIdsAndProfit.push({
          caseId: user.casesIds[0],
          profit: user.profit,
        });
      }
    }
  }

  if (usersIds.length > USERS_NUM) {
    console.error(`Number of users ids(${usersIds.length}, used to delete users, user-items) is bigger than number of users to run tests(${USERS_NUM}), that is weird, skip deleting them from mongodb`);
    console.error('Users ids:', usersIds);
  }
  else {
    try {
      const result = await User.deleteMany({
        testing: true,
        // _id: {
        //   $in: usersIds,
        // },
      });

      console.log(`${result.deletedCount} test users removed from mongodb`);
    } catch (err) {
      console.error('Could not delete users from mongodb, err:', err);
      console.error('Users ids:', usersIds);
    }

    try {
      const result = await UserStatistics.deleteMany({
        testing: true,
        // user: {
        //   $in: usersIds,
        // },
      });

      console.log(`${result.deletedCount} test user-statistics removed from mongodb`);
    } catch (err) {
      console.error('Could not delete user-statistics from mongodb, err:', err);
      console.error('Users ids:', usersIds);
    }

    try {
      const result = await UserItem.deleteMany({
        testing: true,
        // user: {
        //   $in: usersIds,
        // },
      });

      console.log(`${result.deletedCount} test user-items removed from mongodb`);
    } catch (err) {
      console.error('Could not delete user-items from mongodb, err:', err);
      console.error('Users ids', usersIds);
    }
  }

  if (dicesIds.length > USERS_NUM) {
    console.error(`Number of dices ids(${dicesIds.length}, used to delete dices) is bigger than number of users to run tests(${USERS_NUM}), that is weird, skip deleting them from mongodb`);
    console.error('Dices ids:', dicesIds);
  }
  else {
    try {
      const result = await Dice.deleteMany({
        testing: true,
        // _id: {
        //   $in: dicesIds,
        // },
      });

      console.log(`${result.deletedCount} test dices removed from mongodb`);
    } catch (err) {
      console.error('Could not delete dices from mongodb, err:', err);
      console.error('Dices ids', dicesIds);
    }
  }

  if (caseOpeningsIds.length > USERS_NUM) {
    console.error(`Number of case-openings ids(${caseOpeningsIds.length}, used to delete case-openings) is bigger than number of users to run tests(${USERS_NUM}), that is weird, skip deleting them from mongodb`);
    console.error('Case-openings ids:', caseOpeningsIds);
  }
  else {
    try {
      const result = await CaseOpening.deleteMany({
        testing: true,
        // _id: {
        //   $in: caseOpeningsIds,
        // },
      });

      console.log(`${result.deletedCount} test case-openings removed from mongodb`);
    } catch (err) {
      console.error('Could not delete case-openings from mongodb, err:', err);
      console.error('Case-openings ids:', caseOpeningsIds);
    }
  }

  try {
    const result = await CaseStatistics.deleteMany({
      testing: true,
    });

    console.log(`${result.deletedCount} test case-statistics removed from mongodb`);
  } catch (err) {
    console.error('Could not remove test case-statistics, err:', err);
  }

  // if (casesIds.length > USERS_NUM) {
  //   console.error(`Number of cases ids(${casesIds.length} used to remove users from case-statistics) is bigger than number of users to run tests(${USERS_NUM}), that is weird, skip deleting them from mongodb`);
  //   console.error('Cases ids:', casesIds);
  // }
  // else {
  //   const unsetObject = Object.fromEntries(usersIds.map((userId) => {
  //     return [`perUser.${userId}`, 1];
  //   }));
  //
  //   try {
  //     await CaseStatistics.updateMany({
  //         case: {
  //           $in: casesIds,
  //         },
  //       },
  //       {
  //         $unset: unsetObject,
  //       },
  //     );
  //
  //     console.log('Test users removed from case-statistics in mongodb')
  //   } catch (err) {
  //     console.error('Could not remove users from case-statistics in mongodb, err:', err);
  //     console.error('Cases ids:', casesIds);
  //     console.error('Users ids:', usersIds);
  //   }
  // }

  // if (casesIdsAndProfit.length > USERS_NUM) {
  //   console.error(`Number of cases ids-and-profit(${casesIdsAndProfit.length}, used to decrease cases profit, decrease case-statistics unregistered views) is bigger than number of users to run tests(${USERS_NUM}), that is weird, skip deleting them from mongodb`);
  //   console.error('Cases ids-and-profit', casesIdsAndProfit);
  // }
  // else {
  //   for (const { caseId, profit } of casesIdsAndProfit) {
  //     try {
  //       await Case.updateOne({
  //         _id: caseId,
  //       }, {
  //         $inc: {
  //           profit: -profit,
  //         }
  //       });
  //     } catch (err) {
  //       console.error('Could not decrease case profit, err:', err);
  //       console.error(`Case id: ${caseId}, profit: ${profit}`);
  //     }
  //
  //     try {
  //       await CaseStatistics.updateOne({
  //         case: caseId,
  //       }, {
  //         $inc: {
  //           unregisteredViews: -1,
  //         }
  //       });
  //     } catch (err) {
  //       console.error('Could not decrease unregistered views, err:', err);
  //       console.error(`Case id: ${caseId}`);
  //     }
  //   }
  //
  //   console.log('Test case profit and unregistered views removed from mongodb');
  // }

  console.log('Exit');

  mongoose.disconnect();
})();

class UserTest {
  constructor() {
    this.username = `tests_${generateRandomHexString(8).toLowerCase()}`;
    this.email = `${this.username}@lootie.com`;
    this.password = 'a' + generateRandomHexString(32);
    this.refCode = generateRandomHexString(8);
    this.token = void 0;
    this.mongoId = void 0;
    this.dicesIds = [];
    this.caseOpeningsIds = [];
    this.casesIds = [];
    this.profit = void 0;
  }

  async _getMessages() {
    // await rp(`${BACKEND_URL}/v1/rooms/5c3ee57440e88275fe841af7/messages`); 
  }

  async _getLatestDrops() {
    try {
      return await rp(`${BACKEND_URL}/v1/case-openings/latest-drops`, {
        json: true,
        headers: {
          'X-Test-Token': process.env.TEST_CALL_TOKEN,
        },
      }); 
    } catch (err) {
      return false;
    }
  }

  async _getCases() {
    try {
      return await rp(`${BACKEND_URL}/v1/cases?limit=20&offset=0&sortBy=name&sortDirection=asc&caseType=OFFICIAL&`, {
        json: true,
        headers: {
          'X-Test-Token': process.env.TEST_CALL_TOKEN,
        },
      }); 
    } catch (err) {
      return false;
    }
  }

  async _getOrderedItems(slug) {
    try {
      return await rp(`${BACKEND_URL}/v1/cases/${slug}/ordered-items`, {
        json: true,
        headers: {
          'X-Test-Token': process.env.TEST_CALL_TOKEN,
        },
      }); 
    } catch (err) {
      return false;
    }
  }

  async register() {
    const startTime = process.hrtime.bigint();

    this._getMessages();
    this._getLatestDrops();
    this._getCases();

    const resp = await rp({
      url: `${BACKEND_URL}/v1/users/`,
      body: {
        username: this.username,
        email: this.email,
        password: this.password,
        profileImageUrl: '1',
      },
      headers: {
        'X-Test-Token': process.env.TEST_CALL_TOKEN,
      },
      method: 'POST',
      json: true,
    });

    this.mongoId = resp.data.user._id;

    const finishTime = process.hrtime.bigint();
    return finishTime - startTime;
  }

  async login() {
    const startTime = process.hrtime.bigint();

    this._getMessages();
    this._getLatestDrops();
    this._getCases();

    const resp = await rp({
      url: `${BACKEND_URL}/v1/users/authenticate/email`,
      body: {
        email: this.email,
        username: this.username,
        password: this.password,
      },
      headers: {
        'X-Test-Token': process.env.TEST_CALL_TOKEN,
      },
      method: 'POST',
      json: true,
    });

    this.mongoId = resp.data.user._id;

    const finishTime = process.hrtime.bigint();
    return finishTime - startTime;
  }

  async unbox() {
    const startTime = process.hrtime.bigint();

    this._getMessages();
    this._getLatestDrops();
    this._getCases();

    const orderedItems = await this._getOrderedItems(testCaseId);

    const createResp = await rp({
      url: `${BACKEND_URL}/v1/case-openings/`,
      body: {
        seed: 'b47zss88bkg69eoe',
        caseId: testCaseId,
        count: 1,
      },
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-Test-Token': process.env.TEST_CALL_TOKEN,
      },
      method: 'POST',
      json: true,
    });

    this.caseOpeningsIds.push(createResp.result._id);
    this.dicesIds.push(createResp.result.dices[0]._id);

    const rollResp = await rp({
      url: `${BACKEND_URL}/v1/case-openings/${createResp.result._id}/roll`,
      body: {},
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-Test-Token': process.env.TEST_CALL_TOKEN,
      },
      method: 'POST',
      json: true,
    });

    const finishTime = process.hrtime.bigint();
    return finishTime - startTime;
  }

  // async createBox() {
  //
  // }
  //
  // async getHistory() {
  //
  // }
}

async function connectToMongo() {
  try {
    console.log(`Establishing mongodb connection...`);

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
    mongoose.plugin(slugify);
    mongoose.set({ debug: true });
    console.log(`Mongodb connection established`);
  } catch (error) {
    console.error(`Mongodb connection error = ${error}`);
  }
}
