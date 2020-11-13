const cron = require("node-cron");

const {
  steamProvider,
  waxProvider,
  amazonProvider,
  stockxProvider
} = require("./trade-providers");
const { updateCasePrices } = require("./cases");
const socketModule = require("./socket");
const { CaseModule } = require("./index");
const logger = require("./logger");

const initCronJobs = async () => {
  // setTimeout(opskinsSyncJob, 10000);
  // setTimeout(steamSyncJob, 5000);
  // setTimeout(descriptionSync, 5000);
  setTimeout(async () => {
    await Promise.all([
      amazonSyncJob(),
      stockxSyncJob()
    ]);
    await casePriceSyncJob();
  }, 10000);

  cron.schedule("0 0 * * *", async () => {
    await Promise.all([
      amazonSyncJob(),
      stockxSyncJob()
    ]);
    await casePriceSyncJob();
  });

  await socketModule.resetOnlineStatuses();

  cron.schedule("*/10 * * * *", () => {
    socketModule.checkOnline();

    CaseModule.updateTop100Category();
  });

  // update description every month
  cron.schedule("0 0 0 1 * *", async () => {
    await descriptionSync();
  });
};

const steamSyncJob = async () => {
  logger.info("Synchronizing steam caches");
  await steamProvider.syncSteamInventoryCache();

  logger.info("Steam cache synchronized");
};

const opskinsSyncJob = async () => {
  await waxProvider.setWaxUserInventoryCache();
};

const stockxSyncJob = async () => {
  logger.info("Synchronizing stockx caches");
  await stockxProvider.syncStockxPrices();
  logger.info("Stockx cache synchronized");
};

const amazonSyncJob = async () => {
  logger.info("Synchronizing amazon caches");
  await amazonProvider.syncAmazonMain();
  logger.info("Amazon cache synchronized");
};

const casePriceSyncJob = async () => {
  logger.info("Synchronizing case prices");
  await updateCasePrices();
  logger.info("Case prices synchronized");
};

const descriptionSync = async () => {
  logger.info("Synchronizing description");
  await amazonProvider.syncAmazonDesc();
  await stockxProvider.syncStockxDesc();
  logger.info("Description synchronized");
};

module.exports = {
  initCronJobs
};
