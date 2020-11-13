const http = require("http");
const shortId = require("short-id");
const { uniqBy } = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");
const { translate } = require('../i18n');

const globalEvent = require("./event");
const { saveMessage } = require("./chats");
const { verifyToken } = require("./auth");
const { userStatuses, upgradeStatuses } = require("../constants");
const config = require("../../config");
const CaseOpening = require("../models/case-opening");
const Upgrade = require("../models/upgrade");
const SiteItem = require("../models/site-item");
const UserItem = require("../models/user-item");
const User = require("../models/user");
const Case = require("../models/case");
const { utils } = require("../helpers");
const logger = require("./logger");
const redis = require("./redis");
const MODULE_NAME = "SOCKET";

const socketList = [];
let eventList = [];
let server;
let io;

// socketio client object to user mongo id
const clientUserIdMap = new WeakMap();
const userIdClientArray = [];
let onlineUsers = new Set();

const NAMESPACE = "/";

const initSocketServer = function(app) {
  server = http.createServer(app);
  io = require("socket.io")(server, {
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ['websocket']
  });
  const nsp = io.of(NAMESPACE);
  server.listen(config.app.socketPort);

  logger.info(`Socket Server opened at port ${config.app.socketPort}`, {
    MODULE_NAME
  });

  nsp.on("connection", async client => {
    socketList.push(client);

    // logger.info(`Client connected`, { MODULE_NAME, client: client.id });
    if (client.handshake.query && client.handshake.query.token) {
      try {
        await auth(client.handshake.query.token, client);
      } catch (error) {
        console.error("Handshake error: ", { error, MODULE_NAME });
      }
    }

    client.on("messages", recieveMessageHandler);
    client.on("users.logout", data => {
      // logger.info(`Socket logout`, { data, MODULE_NAME });

      removeToken(client);
    });
    client.on("users.login", async data => {
      // logger.info(`Socket login`, { data, MODULE_NAME });
      if (typeof data === "object" && data.accessToken !== void 0) {
        await auth(data.accessToken, client);
      }
    });
    client.on("disconnect", () => {
      disconnectHandler(client);
    });
    client.on("lang.set", (msg) => {
      // update language
      if (
        msg instanceof Object === false
        || 'lang' in msg === false
        || typeof msg.lang !== 'string'
      ) {
        return;
      }

      if (clientUserIdMap.has(client) === true) {
        clientUserIdMap.get(client).lang = msg.lang;
      }
    });
  });

  const auth = async (token, client) => {
    try {
      // check if access token is correct
      if (token === 'null') {
        return;
      }

      const tokenParsed = await verifyToken(token);
      const id = shortId.generate();

      const rps = redis.subscribe(tokenParsed.id, data => {
        emitHandler({ userId: tokenParsed.id, ...data });
      }, () => {
        processCache(tokenParsed.id);
      });

      clientUserIdMap.set(client, { id, userId: tokenParsed.id, rps });
      userIdClientArray.push({
        userId: tokenParsed.id,
        id,
        client
      });
      // const userIdClients = uniqBy(userIdClientArray, "userId");

      // nsp.emit("users.online", { count: userIdClients.length || 0 });
    } catch (error) {
      console.log(`Socket auth error`, { error, MODULE_NAME });
      removeToken(client);
    }
  };

  const removeToken = client => {
    // remove client token
    if (clientUserIdMap.has(client) === true) {
      const userInfo = clientUserIdMap.get(client);
      const indexInArray = userIdClientArray.findIndex(
        v => v.id === userInfo.id
      );
      const evtIndexInArray = eventList.findIndex(
        v => v.userId === userInfo.id
      );
      if (indexInArray !== -1) {
        userIdClientArray.splice(indexInArray, 1);
      }
      if (evtIndexInArray !== -1) {
        eventList.splice(evtIndexInArray, 1);
      }

      clientUserIdMap.delete(client);

      // const userIdClients = uniqBy(userIdClientArray, "userId");
      // nsp.emit("users.online", { count: userIdClients.length || 0 });

      if (userInfo.rps) {
        userInfo.rps.quit();
      }
    }
  };

  const recieveMessageHandler = async data => {
    // logger.info(`Message received`, { data, MODULE_NAME });

    // message validation
    if (utils.REGEXS.message.test(data.text)) {
      return;
    }
    try {
      const user = await User.findById(data.sender);

      if (user) {
        if (user.chatMuteInfo) {
          const { timestamp, minute } = user.chatMuteInfo;

          if (minute === -1) {
            return;
          }
          if (timestamp && minute) {
            const mutedTime = moment().subtract(minute, "minutes");

            if (moment(timestamp).isBefore(mutedTime)) {
              delete user.chatMuteInfo;
              await user.save();
            } else {
              return;
            }
          }
        }
      } else {
        return;
      }
      
      const saved = await saveMessage(data, translate);
      nsp.emit("messages.new", saved);
    } catch (error) {
      logger.error("New message error", { error, MODULE_NAME })
    }
  };

  const joinRoomHandler = async ({ roomName, userId }) => {
    try {
      const uid = userId instanceof mongoose.Types.ObjectId
        ? userId.toString()
        : userId;

      if (uid) {
        const clients = userIdClientArray
          .filter(v => v.userId === uid)
          .map(v => v.client);

        clients.forEach(client => {
          const alreadyJoinedRooms = Object.keys(client.rooms);
          console.log(alreadyJoinedRooms);

          if (!alreadyJoinedRooms.includes(roomName)) {
            client.join(roomName);
          }
        });
      }
    } catch (error) {
      logger.log('Join Handler', { MODULE_NAME, userId, roomName });
    }
  }

  const leaveRoomHandler = async ({ roomName, userId }) => {
    try {
      const uid = userId instanceof mongoose.Types.ObjectId
        ? userId.toString()
        : userId;

      if (uid) {
        const clients = userIdClientArray
          .filter(v => v.userId === uid)
          .map(v => v.client);

        clients.forEach(client => {
          const alreadyJoinedRooms = Object.keys(client.rooms);
          const roomsToLeave = alreadyJoinedRooms.filter(
            room => roomName instanceof RegExp
              ? roomName.test(room)
              : roomName === room
          );

          clients.forEach(client => {
            roomsToLeave.forEach(room => client.leave(room));
          });
        });
      }
    } catch (error) {
      logger.log('Join Handler', { MODULE_NAME, userId, roomName });
    }
  }

  const emitHandler = async ({ eventName, roomName, userId, isPublished, isSingle, ...data }) => {
    try {
      // emitting to a room
      if (roomName) {
        io.to(roomName).emit(eventName, data);
        return;
      }

      const uid = userId instanceof mongoose.Types.ObjectId
        ? userId.toString()
        : userId;

      if (uid) {
        const clients = userIdClientArray
          .filter(v => v.userId === uid)
          .map(v => v.client);

        let { [uid]: subCounts } = await redis.numsubAsync([uid]);
        const payload = { eventName, isSingle, ...data };

        // no listeners found, caching
        if (!isPublished) {
          if (subCounts === 0) {
            await pushToCache(uid, payload);
          } else {
            // publish event
            await redis.publish(uid, { ...payload, isPublished: true });
          }
        } else {
          // all events will be handled through pubsub approach
          if (isSingle) {
            // publish to just one client if flag is provided
            clients[0].emit(eventName, data);
          } else {
            clients.forEach(client => client.emit(eventName, data));
          }
        }
      } else {
        socketList.forEach(conn => conn.emit(eventName, data));
      }
    } catch (err) {
      logger.log('Emit Handler',
        { MODULE_NAME, userId, data: { eventName, isSingle, ...data } }
      );
    }
  };

  // push to cache
  const pushToCache = async (userId, data) => {
    const userCacheKey = redis.getKey('USER_PREFIX', userId);
    const unlock = await redis.lock(userCacheKey);

    try {
      let cache = await redis.hgetAsync(userCacheKey, 'events');

      if (!cache) {
        cache = [];
      }

      cache.push(data);

      redis.hmset(userCacheKey, { events: cache });
    } catch (err) {
      logger.log('Push to Cache', { MODULE_NAME, userId, data });
    } finally {
      unlock();
    }
  }

  // process stacked user event cache
  const processCache = async (userId) => {
    // checking sub counts, return if no subscribers
    const userCacheKey = redis.getKey('USER_PREFIX', userId);
    const unlock = await redis.lock(userCacheKey);

    try {
      // caching
      let cache = await redis.hgetAsync(userCacheKey, 'events');

      if (cache) {
        cache.forEach(event => {
          emitHandler({
            ...event,
            userId
          });
        });

        // clear
        cache = [];
        redis.hmset(userCacheKey, { events: cache });
      }
    } catch (error) {
      logger.log('Process Cache', { MODULE_NAME, userId, error });
    } finally {
      unlock();
    }
  }

  const disconnectHandler = client => {
    console.log(`Client disconnected`, { MODULE_NAME, client: client.id });

    removeToken(client);
  };

  globalEvent.on("socket.emit", emitHandler);
  globalEvent.on("socket.room.join", joinRoomHandler);
  globalEvent.on("socket.room.leave", leaveRoomHandler);

  // TODO: remove on prod
  let lastCaseOpeningId;

  const sendOpenedCase = async () => {
    if (server.listening === false) {
      return;
    }

    const formatItems = v => {
      const { user, case: openedCase, item } = v;

      return {
        user: {
          _id: user._id,
          name: user.username,
          image: user.profileImageUrl,
          unboxCount: user.unboxedCases,
          upgradeCount: user.upgradedItems,
          createdAt: user.createdAt
        },
        case: {
          id: openedCase._id,
          name: openedCase.name,
          image: openedCase.thumbnail || openedCase.image
        },
        item: {
          name: item.name,
          image: item.image,
          thumbnail: item.thumbnail || item.image,
          price: item.value,
          color: item.color,
          tag: item.tag || item.type
        }
      };
    };

    // get last added case opening
    const preStages = [
      { $match: {
        'winItems.0': { $exists: true },
        winItems: {
          $nin: [
            mongoose.Types.ObjectId("5e42739d11eb23f6508b0493"),
            mongoose.Types.ObjectId("5e42739d11eb23f6508b0492"),
            mongoose.Types.ObjectId("5e3efb514cff02420bf9ef21")
          ]
        }
      }},
      { $sort: {
        createdAt: -1
      }},
    ];
    const populateCaseStages = [
      { $lookup: {
        from: "cases",
        localField: "case",
        foreignField: "_id",
        as: "case"
      }},
      { $unwind: "$case" },
      { $match: {
        case: { $exists: true },
        'case.isDisabled': { $ne: true },
      }},
    ];
    const populateItemStages = [
      { $lookup: {
        from: "site-items",
        localField: "winItems",
        foreignField: "_id",
        as: "item"
      }},
      { $unwind: "$item" },
    ];
    const populateUserStages = [
      { $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user"
      }},
      { $unwind: "$user" },
      { $match: {
        user: { $exists: true },
        'user.status': { $ne: 'DISABLED' },
        'user.username': { $nin: ['oscar', 'jospoeze'] }
      }},
    ];
    const projectionStages = [
      { $project: {
        "user._id": 1,
        "user.username": 1,
        "user.unboxedCases": 1,
        "user.upgradedItems": 1,
        "user.createdAt": 1,
        "user.profileImageUrl": 1,
        "case._id": 1,
        "case.name": 1,
        "case.image": 1,
        "case.thumbnail": 1,
        "item.name": 1,
        "item.image": 1,
        "item.value": 1,
        "item.thumbnail": 1,
        "item.color": 1,
        "item.tag": 1,
        "item.type": 1
      }}
    ];

    const normalQuery = [
      ...preStages,
      { $limit: 1000 },
      { $skip: Math.floor(Math.random() * 949) },
      ...populateCaseStages,
      ...populateUserStages,
      ...populateItemStages,
      { $limit: 50 },
      ...projectionStages
    ];
    let normalUnboxings = await CaseOpening.aggregate(normalQuery).allowDiskUse(true);

    if (normalUnboxings) {
      normalUnboxings = normalUnboxings.map(formatItems);
    } else {
      normalUnboxings = [];
    }

    let expUnboxings = await redis.getAsync(redis.getKey('EXP_UNBOXING_KEY'));

    // sync every 30 mins
    if (!expUnboxings || new Date().getMinutes() % 30 === 0) {
      const expQuery = [
        ...preStages,
        ...populateCaseStages,
        ...populateUserStages,
        ...populateItemStages,
        { $match: {
          'item.value': { $gte: 5 }
        }},
        { $limit: 50 },
        ...projectionStages
      ];
      expUnboxings = await CaseOpening.aggregate(expQuery).allowDiskUse(true);

      if (expUnboxings) {
        expUnboxings = expUnboxings.map(formatItems);
      } else {
        expUnboxings = [];
      }

      await redis.set(redis.getKey('EXP_UNBOXING_KEY'), expUnboxings);
    }

    const unboxingPool = Math.random() < 0.7 ? normalUnboxings : expUnboxings;
    const caseOpening = unboxingPool[Math.floor(Math.random() * unboxingPool.length)];

    if (caseOpening
      // && caseOpenings[0]._id.toString() !== lastCaseOpeningId
    ) {
      nsp.emit("case.opening", caseOpening);

      // save last case id
      // lastCaseOpeningId = _id.toString();
    } else {
      // old item
    }

    // wait few seconds and then send new case opening
    // 2 - 10 secs
    const timeToWait = Math.floor(Math.random() * 8000 + 2000);

    setTimeout(() => {
      sendOpenedCase();
    }, timeToWait); 
  };

  // TODO: remove on prod
  let lastUpgradeId;

  const sendUpgrade = async (skipBack = 0) => {
    if (server.listening === false) {
      return;
    }

    // get last added case opening
    const upgrades = await Upgrade.find({ status: upgradeStatuses.Win })
      .populate("sourceItems", "name image value color")
      .populate("targetItems", "name image value color")
      .populate("user", "username profileImageUrl")
      .select("sourceItems targetItems user")
      .sort({ _id: -1 })
      .skip(skipBack)
      .lean();

    if (
      upgrades.length !== 0
      // && upgrades[0]._id.toString() !== lastUpgradeId
    ) {
      const randomIndex = Math.ceil(Math.random() * (upgrades.length - 1));
      const upgrade = upgrades[randomIndex];

      nsp.emit("upgrade.latest", {
        user: {
          name: upgrade.user.username,
          profileImageUrl: upgrade.user.profileImageUrl,
          id: upgrade.user._id
        },
        sourceItems: upgrade.sourceItems,
        targetItems: upgrade.targetItems,
        timestamp: Date.now()
      });

      await utils.asyncWait(3000);

      // save last upgrade id
      lastUpgradeId = upgrade._id.toString();
    } else {
      // old item
    }

    // wait few seconds and then send new upgrade
    // 2 - 10 secs
    const timeToWait = Math.floor(Math.random() * 8000 + 2000);

    setTimeout(() => {
      if (skipBack > 2) {
        sendUpgrade(skipBack - 1);
      } else {
        sendUpgrade();
      }
    }, timeToWait);
  };

  sendOpenedCase(15);
  // sendUpgrade(20);
};

const closeSocketServer = function() {
  // socketList.forEach(conn => conn.destroy());
  server.close(() => logger.info(`Socket server closed`));
};

const checkOnline = async () => {
  const nsp = io.of(NAMESPACE);
  // get all namespace clients
  const clients = await new Promise((resolve, reject) => {
    nsp.clients((err, clients) => {
      if (err !== null) {
        reject(err);
      } else {
        resolve(clients);
      }
    });
  });

  // get every mongo id who is currently online
  const nowOnline = clients.reduce((accum, client) => {
    const userInfo = clientUserIdMap.get(nsp.sockets[client]);

    if (userInfo && userInfo.userId !== void 0) {
      accum.add(userInfo.userId);
    }
    return accum;
  }, new Set());

  // now calculate who is went offline and who went online
  // based on difference with online users on last check
  const setOffline = [];
  const setOnline = [];

  nowOnline.forEach(user => {
    if (onlineUsers.has(user) === false) {
      setOnline.push(user);
    }
  });

  onlineUsers.forEach(user => {
    if (nowOnline.has(user) === false) {
      setOffline.push(user);
    }
  });

  onlineUsers = nowOnline;

  // update db
  const setOnlineCondition = setOnline.map(userId => {
    return { _id: userId };
  });

  if (setOnlineCondition.length !== 0) {
    await User.updateMany(
      { $or: setOnlineCondition },
      { $set: { status: userStatuses.Online } }
    );
  }

  const setOfflineCondition = setOffline.map(userId => {
    return { _id: userId };
  });

  if (setOfflineCondition.length !== 0) {
    await User.updateMany(
      { $or: setOfflineCondition },
      { $set: { status: userStatuses.Offline } }
    );
  }

  return true;
};

const resetOnlineStatuses = async () => {
  await User.updateMany(
    { status: userStatuses.Online },
    { status: userStatuses.Offline }
  );

  return true;
};

const getOnlineUsers = () => {
  const userIdClients = uniqBy(userIdClientArray, "userId");
  return userIdClients.map(v => v.userId);
};

module.exports = {
  initSocketServer,
  closeSocketServer,
  resetOnlineStatuses,
  checkOnline,
  getOnlineUsers
};
