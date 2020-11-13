const mongoose = require('mongoose');
const config = require('../config');
const CaseStatistics = require('../app/models/case-statistics.js');

(async () => {
  await connectToMongo();

  let statistics;

  try {
    statistics = await CaseStatistics.find({});
  } catch (err) {
    console.error('Error while aggregating duplicated ref code accounts, exit', err);
    return process.exit(1);
  }

  if (statistics.length === 0) {
    console.log('There is no statistic, exit');
    return process.exit(0);
  }
  else {
    await Promise.all(statistics.map(async (statistic) => {

      const perUser = statistic.get('perUser');

      if (perUser) {

        const statisticId = statistic._id;
        const userUIDs = Object.keys(perUser);
        const statisticIds = [];

        await Promise.all(userUIDs.map(async (user) => {

          let newCase = {};

          const caseId = statistic.case;
          const userInfo = perUser[user];
          const userViews = userInfo['views'];
          const userOpens = userInfo['opens'];

          const newStatisticId = mongoose.Types.ObjectId();

          newCase['_id'] = mongoose.Types.ObjectId(newStatisticId);
          newCase['user'] = mongoose.Types.ObjectId(user);
          newCase['case'] = mongoose.Types.ObjectId(caseId);

          newCase['opens'] = userOpens;
          newCase['views'] = userViews;


          if (statisticIds.includes(statisticId)) {
            const newStatisticId = mongoose.Types.ObjectId();
            statistic._id = newStatisticId;
            statisticIds.push(newStatisticId)
          }

          if (statisticIds.length == 0) {
            statisticIds.push(statisticId);
          }
          await CaseStatistics.create(newCase);

        }))

        await CaseStatistics.remove({ _id: statisticId });

      }
    }))
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
      options['user'] = config.db.user;
      options['pass'] = config.db.pass;
      options['dbName'] = config.db.name;
    }

    await mongoose.connect(dbUrl, options);
    mongoose.set({ debug: true });
    console.log(`Mongodb connection established`);
  } catch (error) {
    console.error(`Mongodb connection error = ${error}`);
  }
}