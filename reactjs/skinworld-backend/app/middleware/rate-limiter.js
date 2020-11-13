const redis = require("redis");
const { RateLimiterRedis } = require("rate-limiter-flexible");

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  enable_offline_queue: false
});

redisClient.on("error", function (err) {
  console.log("Redis Error:" + err);        
});

const rateLimiter = new RateLimiterRedis({
  redis: redisClient,
  keyPrefix: "middleware",
  points: 10, // 10 requests
  duration: 1 // per 1 second by IP
});

const rateLimiterMiddleware = (req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).send("Too Many Requests");
    });
};

module.exports = rateLimiterMiddleware;
