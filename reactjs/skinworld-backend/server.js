const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const methodOverride = require("method-override");

const { passport } = require("./app/modules/auth");
const { initCronJobs } = require("./app/modules/cron");
const { steamProvider } = require("./app/modules/trade-providers");
const { SocketModule, RedisModule, logger } = require("./app/modules");
const {
  errorHandler,
  corsHandler,
  unless,
  rateLimiter,
  apiTracker
} = require("./app/middleware");
const { router } = require("./app/routes");
const db = require("./app/models/db");

const port = process.env.PORT;

db.connect();
db.createCollections();

SocketModule.initSocketServer(app);

if (process.env.ENV !== "dev") {
  initCronJobs();
}

RedisModule.initClient();
// steamProvider.initSteamListeners();
// InventoryModule.initWaxRedis();

app.set("trust proxy", true);

// disable rate limiter on test mode
if (process.env.TEST_CALL_TOKEN === undefined) {
  app.use(rateLimiter);
}

app.use(
  unless(
    ["/v1/withdrawals/aftership-wh", "/v1/deposit/process-coinbase-webhook"],
    bodyParser.json()
  )
);
app.use(bodyParser.json({ type: "application/vnd.api+json" }));
app.use(
  unless(
    "/v1/deposit/process-cp-ipn",
    bodyParser.urlencoded({ extended: true })
  )
);

app.use(methodOverride("X-HTTP-Method-Override"));
app.use(corsHandler);

app.use(passport.initialize());
app.use(passport.session());

// if (process.env.ENV !== "dev") {
  app.use(apiTracker);
// }

app.use("/v1/", router);

app.use(errorHandler);

const server = app.listen(port, "0.0.0.0");
logger.info(`Server is running on port`, { port });

// when app is closing
process.on("exit", exitHandler.bind(null, { cleanup: true }));

// ctrl+c event
process.on("SIGINT", exitHandler.bind(null, { exit: true }));

// uncaught exceptions
process.on("uncaughtException", exitHandler.bind(null, { exit: true }));

function exitHandler(options, exitCode) {
  if (options.cleanup) {
    // RedisModule.closeRedisServer();
    // RedisModule.closeSocketServer();

    server.close();
  }
  if (exitCode || exitCode === 0)
    logger.error("Internal Server Error", { exitCode });
  if (options.exit) process.exit();
}

exports = module.exports = app;
