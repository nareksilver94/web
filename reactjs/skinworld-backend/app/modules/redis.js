const RedisServer = require("redis-server");
const redis = require("redis");
const lock = require("redis-lock");
const { promisify } = require("util");
const config = require("../../config");
const { userStatuses } = require("../constants");
const User = require("../models/user");
const logger = require("./logger");
const MODULE_NAME = "REDIS";

class RedisModule {
  constructor() {
    this.client = null;
    this.pubsubClient = null;
    this.server = null;
    this.redisLock = null;
  }

  initServer() {
    this.server = new RedisServer(config.app.redisPort);

    return new Promise((resolve, reject) => {
      server.open(error => {
        if (error === null) {
          logger.info(`Redis Server opened at port ${config.app.redisPort}`, {
            MODULE_NAME
          });
          resolve();
        } else {
          logger.error("Redis Server Init error", { error, MODULE_NAME });
          reject();
        }
      });
    });
  }

  closeServer() {
    if (server) {
      server.close().then(() => {
        logger.info("Terminated Redis Server", { MODULE_NAME });
      });
    } else {
      logger.error("No initialized Redis Server found", { MODULE_NAME });
    }
  }

  async initClient() {
    this.client = redis.createClient({
      url: `redis://${config.app.redisHost}:${config.app.redisPort}`,
      retry_strategy: options => {
        if (options.error && options.error.code === "ECONNREFUSED") {
          // End reconnecting on a specific error and flush all commands with
          // a individual error
          return new Error("The server refused the connection");
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          // End reconnecting after a specific timeout and flush all commands
          // with a individual error
          return new Error("Retry time exhausted");
        }
        if (options.attempt > 10) {
          // End reconnecting with built in error
          return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
      },
    });

    const that = this;
    this.client.on("connect", async () => {
      await that.initState();
      
      logger.info("Redis Client connected", { MODULE_NAME });
    });
    this.client.on("end", () => {
      logger.info("Redis Client disconnected", { MODULE_NAME });
    });
    this.client.on("error", error => {
      logger.error("Redis Client Init error", { MODULE_NAME, error });
    });

    this.lock = promisify(lock(this.client));
    this.numsubAsync = promisify(this.numsub).bind(this);
    this.getAsync = promisify(this.get).bind(this);
    this.setAsync = promisify(this.set).bind(this);
    this.hgetAsync = promisify(this.hget).bind(this);
    this.hmsetAsync = promisify(this.hmset).bind(this);
  }

  getClient() {
    return this.client;
  }

  get(key, callback) {
    try {
      this.client.get(key, (err, data) => callback(err, JSON.parse(data)));
    } catch (err) {
      return null;
    }
  }

  set(key, data) {
    try {
      this.client.set(key, JSON.stringify(data));
    } catch (err) {
      return null;
    }
  }

  hget(key, field, callback) {
    try {
      this.client.hget(key, field, (err, data) => callback(err, JSON.parse(data)));
    } catch (err) {
      console.log(err)
      return null;
    }
  }

  hmset(key, data) {
    try {
      const keys = Object.keys(data)
        .reduce((arr, v) =>
          arr.concat(v, JSON.stringify(data[v])),
          []
        );
      this.client.hmset(key, ...keys);
    } catch (err) {
      return null;
    }
  }

  publish(key, data) {
    this.client.publish(key, JSON.stringify(data));
  }

  subscribe(key, msgHandler, scbHandler) {
    const client = redis.createClient({
      url: `redis://${config.app.redisHost}:${config.app.redisPort}`
    });
    client.subscribe(key);

    client.on("message", (_key, message) => {
      msgHandler(JSON.parse(message));
    });

    if (scbHandler) {
      client.on("subscribe", scbHandler);
    }

    return client;
  }

  numsub(channels = [], handler) {
    this.client.pubsub("NUMSUB", ...channels, (err, data) => {
      if (err) {
        return handler(err);
      }

      const result = {};
      for (let i = 0; i < data.length; i += 2) {
        result[data[i]] = data[i + 1];
      }
      handler(null, result);
    });
  }

  /* ----------- Custom Ones ------------- */
  async initState () {
    // first flush all
    this.client.flushall();

    // init user related data
    const userData = await User.find({ ip: { $exists: true } })
      .select('ip status hasFreeboxOpened')
      .lean();
    const ipInfo = {};
    const registered = {};

    const fboxTemp = {};

    userData.forEach(data => {
      let ips = [data.ip];
      if (data.ip.includes(',')) {
        ips = data.ip.split(', ');
      }

      registered[data._id] = data.ip;
      const userKey = this.getKey('USER_PREFIX', data._id);
      this.hmset(userKey, { ip: data.ip });

      ips.forEach(ip => {
        const ipKey = this.getKey('IP_PREFIX', ip);
        fboxTemp[ipKey] = fboxTemp[ipKey] || !!data.hasFreeboxOpened;

        this.hmset(ipKey, {
          status: data.status,
          fboxOpened: fboxTemp[ipKey]
        });
      });
    });
  }

  getKey(prefixKey, keyValue) {
    const mapping = {
      IP_PREFIX: 'ip',
      USER_PREFIX: 'user',
      EXP_UNBOXING_KEY: 'exp_unboxings'
    };
    
    return keyValue ? `${mapping[prefixKey]}_${keyValue}` : mapping[prefixKey];
  }
 }

const instance = new RedisModule();
module.exports = instance;
