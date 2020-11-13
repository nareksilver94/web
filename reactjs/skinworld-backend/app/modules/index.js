const UserModule = require("./users");
const ChatModule = require("./chats");
const InventoryModule = require("./inventory");
const CaseModule = require("./cases");
const CaseOpeningModule = require("./case-openings");
const TransactionModule = require("./transactions");
const ImageModule = require("./image");
const logger = require("./logger");
const AffiliateModule = require('./affiliate');
const WithdrawalModule = require('./withdrawal');
const BattleModule = require('./battle');

const SocketModule = require("./socket");
const RedisModule = require("./redis");
const { UrlDataPipe, FileDataPipe } = require("./image-pipe");

module.exports = {
  AffiliateModule,
  WithdrawalModule,
  UserModule,
  ChatModule,
  InventoryModule,
  CaseModule,
  CaseOpeningModule,
  SocketModule,
  RedisModule,
  TransactionModule,
  ImageModule,
  BattleModule,
  UrlDataPipe,
  FileDataPipe,
  logger
};
