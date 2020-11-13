const request = require('request-promise-native');
const mongoose = require('mongoose');
const User = require('../app/models/user.js');
const Transaction = require('../app/models/transaction.js');
const db = require('../app/models/db.js');

(async () => {
  await db.connect();

  const fails = {};
  const failedTxs = await Transaction.find({
    transactionType: 'DEPOSIT',
    status: 'FAILED',
    subType: 'G2A',
  })
    .select('user')
    .populate('user', 'ip');

  txLoop:
  for (const tx of failedTxs) {
    if (tx.user.ip === void 0 || tx.user.ip === '') {
      continue;
    }

    const ips = new Set(tx.user.ip.split(', '));

    const countryScore = {};

    for (const ip of ips) {
      let resp;

      try {
        resp = await request(`http://ip-api.com/json/${ip}`, { json: true });
        console.log('==> country', '\n', resp.country)
      } catch (err) {
        console.error(`Some error while fetching data for tx ${tx._id} for ip ${ip}, skip tx`);
        await new Promise(resolve => setTimeout(resolve, 60 * 1000));
        continue txLoop;
      }

      const country = resp.countryCode;

      if (country in countryScore === false) {
        countryScore[country] = 1;
      }
      else {
        countryScore[country] += 1;
      }
    }

    const [mainCountry] = Object.entries(countryScore).reduce((accum, [country, score]) => {
      if (score > accum[1]) {
        accum = [country, score];
      }

      return accum;
    });

    if (mainCountry in fails === false) {
      fails[mainCountry] = 1;
    }
    else {
      fails[mainCountry] += 1;
    }
  }

  // sort and print fails
  const sortedFails = Object.entries(fails);
  sortedFails.sort((a, b) => {
    return b[1] - a[1];
  });

  for (const [country, failsNum] of sortedFails) {
    console.log('Results:');
    console.log(`${country}: ${failsNum}`);
  }

  mongoose.disconnect();
})();
