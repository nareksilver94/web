const mongoose = require("mongoose");
const shortId = require("short-id");
const config = require("../config");
const User = require('../app/models/user.js');

(async () => {
  await connectToMongo();

  let duplicatedRefCodes;

  try {
    duplicatedRefCodes = await User.aggregate([
      {
        $group: {
          _id: '$referralCode',
          count: { $sum: 1 },
        }
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);
  } catch (err) {
    console.error('Error while aggregating duplicated ref code accounts, exit', err);
    return process.exit(1);
  }

  if (duplicatedRefCodes.length === 0) {
    console.log('There is no duplicated ref code account, exit');
    return process.exit(0);
  }
  else {
    const recordsNum = duplicatedRefCodes.reduce((accum, value) => {
      return accum + value.count;
    }, 0);

    console.log(`There is ${duplicatedRefCodes.length} duplicated ref code accounts, overall num of records with duplicates is ${recordsNum}, updating...`);
  }

  for (const { _id: referralCode, count: dupNum } of duplicatedRefCodes) {
    console.log(`\nUpdate ${dupNum} records with code ${referralCode}`);
    
    let users;

    try {
      let stats;

      const session = await mongoose.startSession();

      await session.withTransaction(async () => {
        const users = await User.find({ referralCode }).session(session);

        for (let [i, user] of users.entries()) {
          if (i === 0) {
            return;
          }

          user.referralCode = `${shortId.generate()}_${Date.now().toString().slice(9)}`;
          await user.save();
        }
      });
    } catch (err) {
      console.error(`Error while updating records with code ${referralCode}, skip`, err);
      continue;
    }
  }

  console.log(`Done`);

  mongoose.disconnect();
})()


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