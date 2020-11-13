module.exports = {
  host: process.env.HOST,
  port: process.env.PORT,
  frontHost: process.env.FRONT_HOST,
  frontPort: process.env.FRONT_PORT,

  jwtAlgorithm: process.env.JWT_ALGORITHM,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  jwtSecret: process.env.JWT_SECRET,

  socketPort: process.env.SOCKET_PORT,
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,

  googleClientId: process.env.GOOGLE_CLIENT_ID,
  steamApiKey: process.env.STEAM_API_KEY,
  steamGroupId: process.env.STEAM_GROUP_ID,

  awsAccessKey: process.env.AWS_ACCESS_KEY,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION,

  opskinsApiKey: process.env.OPSKINS_API_KEY,

  systemEmail: process.env.SYSTEM_EMAIL,
  systemEmailName: process.env.SYSTEM_EMAIL_NAME,

  s3Bucket: process.env.S3_BUCKET,

  hashSecret: process.env.HASH_SECRET,
  zincApiKey: process.env.ZINC_API_KEY,
  pricesForAvg: 5,
  stockxEmail: process.env.STOCKX_EMAIL,
  stockxPass: process.env.STOCKX_PASS,
  stockxApifyUrl: process.env.STOCKX_APIFY_URL,
  coinpaymentsIpnSecret: process.env.COINPAYMENTS_IPN_SECRET,
  coinpaymentsMerchantId: process.env.COINPAYMENTS_MERCHANT_ID,
  // 0-1, 1 = 100%
  // i.e. 0.01 is 1%
  // index of array elem = referralLevel - 1
  referralCutLevels: [0.05, 0.06, 0.07, 0.08, 0.1],
  // first value is for achieving 2 level
  // second for achieving 3 level, etc
  referralLevels: [50, 200, 1000, 5000],
  // how much add to balance when user apply referral code
  // final value to add = refRewardBase * referralCut
  refRewardBase: 3,
  aftershipWebhookSecret: process.env.AFTERSHIP_WH_SECRET,
  aftershipApiKey: process.env.AFTERSHIP_API_KEY,
  fbAppSecret: process.env.FACEBOOK_APP_SECRET,
  fbAppId: process.env.FACEBOOK_APP_ID,
  discordGuildId: "618783118236844052",
  twitterAccountId: "1234",
  twitterConsumerKey: "123",
  twitterConsumerSecret: "1234",
  g2aApiHash: process.env.G2A_API_HASH,
  g2aApiSecret: process.env.G2A_API_SECRET,
  shippingInfoCountries: ["US", "RU", "DE"],
  coinbaseApiKey: process.env.COINBASE_API_KEY,
  coinbaseWebhookSecret: process.env.COINBASE_WEBHOOK_SECRET,
  socketToken: process.env.SOCKET_TOKEN,
  apiToken: process.env.API_TOKEN,
  battleExpireTime: process.env.BATTLE_EXPIRE_TIME || 3 * 60 * 1000,
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  minWithdrawalPrice: 2,
  randomOrgToken: process.env.RANDOM_ORG_API_KEY,
  payopJwt: process.env.PAYOP_JWT_TOKEN,
  payopPubKey: process.env.PAYOP_PUB_KEY,
  payopSecretKey: process.env.PAYOP_SECRET_KEY,
};
