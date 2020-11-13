const WHITE_LIST = [
  'http://www.lootie.com',
  'https://www.lootie.com',
  'http://admin.lootie.com',
  'http://dev-ui.lootie.com',
  'http://localhost:7777',
  'http://localhost:3000'
];

module.exports = (req, res, next) => {
  const origin = req.get('origin');

  if (WHITE_LIST.indexOf(origin) !== -1) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Lang, ApiToken, Timestamp"
  );
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Cache-Control", "no-store,no-cache,must-revalidate");
  next();
};
