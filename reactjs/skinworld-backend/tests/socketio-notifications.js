const io = require('socket.io-client');
const mongoose = require("mongoose");
const config = require("../config");
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

const USERS_NUM = parseInt(process.env.USERS_NUM) || 10;
const BACKEND_URL = process.env.BACKEND_URL;
const WS_BACKEND_URL = process.env.WS_BACKEND_URL;
let testCaseId;

(async () => {
  console.log('Start socketio tests');

  await connectToMongo();

  const testCase = await Case.findOne({
    testing: true,
  }).lean();

  if (testCase === null) {
    console.error('Can not find test case(with "testing: true"), exit');
    return process.exit(1);
  }
  else {
    testCaseId = testCase._id.toString();
    console.log(`Test case id is ${testCaseId}`);
  }

  // ref masters is accounts of whose referral code is applied
  const refMasters = [];
  const accounts = [];
  
  for (let i = 0; i < USERS_NUM; ++i) {
    // generate accounts
    const isRefMaster = Math.random() > 0.7 || i === 0;

    if (isRefMaster === true) {
      const account = new UserTest();
      accounts[i] = account;
      refMasters.push(account);
    }
    else {
      const refMaster = refMasters[Math.floor(Math.random() * refMasters.length)];
      const account = new UserTest(refMaster);
      refMaster.referrals.push(account);
      accounts[i] = account;
    }
  }

  console.log('Create accounts in mongodb');

  const dbUsers = await User.create(accounts.map((account) => {
    return {
      username: account.username,
      email: account.email,
      referralCode: account.refCode,
      password: bcrypt.hashSync(account.password, 10),
      balance: 105000,
      testing: true,
    };
  }));
  const dbUsersByUsername = Object.fromEntries(dbUsers.map((user) => {
    return [user.username, user];
  }));
  
  for (const account of accounts) {
    // create tokens
    const dbUser = dbUsersByUsername[account.username];
    account.mongoId = dbUser._id.toString();
    account.token = await issueToken({
      id: dbUser._id,
      type: userTypes.User,
      email: account.email
    });
  }

  console.log('Start tests');

  for (const account of accounts) {
    const startSocket = () => {
      const socket = io(`${WS_BACKEND_URL}?token=${account.token}&test_token=${process.env.TEST_CALL_TOKEN}`);

      socket.on('connect', () => {
        console.log(`${account.mongoId} connected`);
      });

      socket.on('user.balance', (...args) => {
        console.log('user balance', account.mongoId, args);

        if ('user.balance' in account.notifNum === false) {
          account.notifNum['user.balance'] = 1;
        }
        else {
          account.notifNum['user.balance'] += 1;
        }
      });

      socket.on('user.referred', (...args) => {
        console.log('user referred', account.mongoId, args);
        if ('user.referred' in account.notifNum === false) {
          account.notifNum['user.referred'] = 1;
        }
        else {
          account.notifNum['user.referred'] += 1;
        }
      });

      socket.on('case.opened', (...args) => {
        console.log('case opened', account.mongoId, args);
        if ('case.opened' in account.notifNum === false) {
          account.notifNum['case.opened'] = 1;
        }
        else {
          account.notifNum['case.opened'] += 1;
        }
      });

      socket.on('ga', (...args) => {
        console.log('ga', account.mongoId, args);
        if ('ga' in account.notifNum === false) {
          account.notifNum['ga'] = 1;
        }
        else {
          account.notifNum['ga'] += 1;
        }
      });

      account.socket = socket;

      const unbox = Math.random() > 0.7;

      if (unbox === true) {
        account.unboxNum += 1;
        account.unbox();
      }

      if (account.isRefMaster === false) {
        account.applyRefCode();
      }
    };

    // const numOfSessions = Math.floor(Math.random() * 4) + 1;
    const numOfSessions = 1;

    account.numOfSessions = numOfSessions;

    for (let i = 0; i < numOfSessions; ++i) {
      // const isDelayed = Math.random() > 0.5;
      const startDelay = Math.random() * 15000;
      console.log(`${account.mongoId} delay is ${startDelay / 1000}`);
      setTimeout(() => {
        startSocket();
      }, startDelay);
    }
  }

  setTimeout(() => {
    console.log('RESULTS:');
    // calculate results
    for (const account of accounts) {
      console.log(account.mongoId, account.referrals.length, account.unboxNum, account.numOfSessions, account.notifNum);

      const EXCPECTED = {
        'user.balance': account.unboxNum,
        'ga': account.unboxNum,
      };

      if (account.isRefMaster === true) {
        EXCPECTED['user.referred'] = account.referrals.length;
      }
      else {
        EXCPECTED['user.balance'] += 1;
      }

      for (const [notifName, notifNum] of Object.entries(EXCPECTED)) {
        const realNotifNum = account.notifNum[notifName] || 0;
        if (realNotifNum !== notifNum) {
          console.error(`User ${account.mongoId}; ${notifNum} ${notifName} notification was excepted, ${realNotifNum} happened`); 
        }
      }

      // account.socket.close();
      // setTimeout(() => {
      //   account.unbox();
      // }, 5000);
    };
  }, 40000);
})();

class UserTest {
  constructor(referredBy) {
    this.username = `tests_${generateRandomHexString(8).toLowerCase()}`;
    this.email = `${this.username}@lootie.com`;
    this.password = 'a' + generateRandomHexString(32);
    this.refCode = generateRandomHexString(4).toLowerCase();
    this.token = void 0;
    this.mongoId = void 0;
    this.socket = void 0;
    this.notifNum = {};
    this.unboxNum = 0;

    if (referredBy === void 0) {
      this.isRefMaster = true;
      this.referrals = [];
    }
    else {
      this.isRefMaster = false;
      this.referredBy = referredBy;
      this.referrals = [];
    }
  }

  async unbox() {
    const startTime = process.hrtime.bigint();

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

  async applyRefCode() {
    const startTime = process.hrtime.bigint();

    const resp = await rp({
      url: `${BACKEND_URL}/v1/affiliate/apply-ref-code`,
      body: {
        refCode: this.referredBy.refCode,
      },
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-Test-Token': process.env.TEST_CALL_TOKEN,
      },
      method: 'POST',
      json: true,
    });
  }
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
    mongoose.set({ debug: true });
    console.log(`Mongodb connection established`);
  } catch (error) {
    console.error(`Mongodb connection error = ${error}`);
  }
}
