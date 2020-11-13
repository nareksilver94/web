const router = require("express").Router();
const redis = require("../modules/redis");
const { isAuthenticated, has } = require("../middleware");
const { userTypes } = require("../constants");
const { statusCodes } = require("../helpers");

const userRoutes = require("./users");
const messageRoutes = require("./chats");
const userItemRoutes = require("./user-inventory");
const siteItemRoutes = require("./site-inventory");
const caseRoutes = require("./cases");
const caseOpeningRoutes = require("./case-opening");
const depositRoutes = require("./deposit");
const affiliateRoutes = require("./affiliate");
const upgradeRoutes = require("./upgrades");
const rewardRoutes = require("./reward");
const withdrawalRoutes = require("./withdrawal");
const statisticsRoutes = require("./statistics");
const transactionRoutes = require("./transactions");
const provablyFairRoutes = require("./provably-fair");
const battleRoutes = require("./battles");
const emailRoutes = require("./email");

router.use((req, res, next) => {
  const testToken = req.get('X-Test-Token');

  if (
    typeof process.env.TEST_CALL_TOKEN === 'string'
    && process.env.TEST_CALL_TOKEN.length > 0
    && testToken === process.env.TEST_CALL_TOKEN
  ) {
    req.isTest = true;
  }

  next();
});

router.use("/users", userRoutes);
router.use("/user-items", userItemRoutes);
router.use("/site-items", siteItemRoutes);
router.use("/cases", caseRoutes);
router.use("/rooms", messageRoutes);
router.use("/case-openings", caseOpeningRoutes);
router.use("/deposit", depositRoutes);
router.use("/affiliate", affiliateRoutes);
router.use("/upgrades", upgradeRoutes);
router.use("/reward", rewardRoutes);
router.use("/withdrawals", withdrawalRoutes);
router.use("/statistics", statisticsRoutes);
router.use("/transactions", transactionRoutes);
router.use("/provably-fairs", provablyFairRoutes);
router.use("/battles", battleRoutes);
router.use("/email", emailRoutes);

/* ---------- Additional APIs ----------- */

// redis reset
router.get("/redis-reset", isAuthenticated, has(userTypes.Admin), async (req, res, next) => {
  try {
    await redis.initState();

    res.status(statusCodes.OK).json({
      message: statusCodes.getStatusText(statusCodes.OK)
    });
  } catch (error) {
    next(error);
  }
});

// time sync
router.get("/time", (req, res, next) => {
  res.status(statusCodes.OK).json({
    message: statusCodes.getStatusText(statusCodes.OK),
    data: Date.now()
  });
});

// health check
router.get("/status", (req, res, next) => {
  res.status(statusCodes.OK).json({
    message: statusCodes.getStatusText(statusCodes.OK)
  });
});


module.exports = {
  router
};
