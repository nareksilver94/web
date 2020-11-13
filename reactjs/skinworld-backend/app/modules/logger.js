const { createLogger, format, transports } = require("winston");
const config = require("../../config");

require("winston-mongodb").Mongo;
require("winston-daily-rotate-file");

const LogLevel = { INFO: "info", WARN: "warn", ERROR: "error" };
const metaDataKeyName = "meta";
const defaultContextName = "DEFAULT";

class LogModule {
  constructor() {
    this.contextName = defaultContextName;
    this.logger = createLogger();

    const logTransportConsole = new transports.Console({
      handleExceptions: true,
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.simple()
      )
    });
    this.logger.configure({
      transports: [
        // logTransportInfoRotate,
        // logTransportErrorRotate,
        logTransportConsole,
      ],
      exitOnError: false
    });

    if (process.env.TEST_CALL_TOKEN) {
      return;
    }

    const logTransportMongoDB = new transports["MongoDB"]({
      db: config.db.log_url,
      handleExceptions: true,
      metaKey: metaDataKeyName,
      collection: "error_log",
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    });
    // const logTransportInfoRotate = new transports.DailyRotateFile({
    //   level: "info",
    //   filename: "info-%DATE%.log",
    //   datePattern: "YYYY-MM-DD-HH",
    //   zippedArchive: true,
    //   maxSize: "1m",
    //   dirname: "logs"
    // });
    // const logTransportErrorRotate = new transports.DailyRotateFile({
    //   level: "error",
    //   filename: "error-%DATE%.log",
    //   datePattern: "YYYY-MM-DD-HH",
    //   zippedArchive: true,
    //   maxSize: "1m",
    //   maxFiles: "14d",
    //   dirname: "logs"
    // });

    this.logger.add(logTransportMongoDB);
  }

  configure(configuration, contextName) {
    this.logger.configure(configuration);
    this.contextName = contextName ? contextName : this.contextName;
  }

  log(message, meta) {
    this.logger.log({
      level: LogLevel.INFO,
      message,
      meta: { context: this.contextName, ...meta }
    });
  }

  info(message, meta) {
    this.logger.log({
      level: LogLevel.INFO,
      message,
      meta: { context: this.contextName, ...meta }
    });
  }

  warn(message, meta) {
    this.logger.log({
      level: LogLevel.WARN,
      message,
      meta: { context: this.contextName, ...meta }
    });
  }

  error(message, metaData = {}) {
    const { error, ...otherMeta } = metaData;
    let meta = { context: this.contextName, ...otherMeta };
    if (error) {
      meta = Object.assign(meta, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    this.logger.log({
      level: LogLevel.ERROR,
      message,
      meta
    });
  }
}

module.exports = new LogModule();
