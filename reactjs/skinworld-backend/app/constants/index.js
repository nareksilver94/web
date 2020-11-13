const COUNTRIES = require("./countries");

module.exports = {
  caseTypes: {
    OFFICIAL: "OFFICIAL",
    DAILY: "DAILY",
    USER: "USER",
    HYPEBEAST: "HYPEBEAST",
    CENT: "GAMING",
    NEW_CASE: "NEW CASE",
    TOP100: "TOP 100",
    STREETWEAR: "STREETWEAR",
    ELECTRONICS: "ELECTRONICS",
    ACCESSORIES: "ACCESSORIES",
    FREE: "FREE",
  },
  transactionTypes: {
    Adjustment: "ADJUSTMENT",
    Deposit: "DEPOSIT",
    Withdraw: "WITHDRAW",
    Coupon: "COUPON",
    Reward: "REWARD",
    AffiliateReward: "AFFILIATE_REWARD",
    ShipmentFee: "SHIPMENT_FEE"
  },
  depositTypes: {
    CoinPayment: "COIN_PAYMENT",
    G2A: "G2A",
    Steam: "STEAM",
    Coinbase: "COINBASE",
    Giftcard: "GIFTCARD",
    Payop: "PAYOP",
    Other: "OTHER"
  },
  transactionStatuses: {
    Pending: "PENDING",
    Completed: "COMPLETED",
    Failed: "FAILED"
  },
  rewardTypes: {
    None: "NONE",
    ReferralsRevenueReward: "REFFERALS_REVENUE_REWARD",
    DailyReward: "DAILY_REWARD",
    WebNotificationsReward: "WEB_NOTIFICATION_REWARD",
    MobileAppReward: "MOBILE_APP_REWARD",
    SteamGroupReward: "STEAM_GROUP_REWARD",
    TwitterReward: "TWITTER_REWARD",
    AffiliateCodeReward: "AFFILIATE_CODE_REWARD"
  },
  opskinsTradeOfferStatuses: {
    Active: "ACTIVE",
    Accepted: "ACCEPTED",
    Expired: "EXPIRED",
    Canceled: "CANCELED",
    Declined: "DECLINED",
    InvalidItems: "INVALID_ITEMS",
    PendingCaseOpen: "PENDING_CASE_OPEN",
    ExpiredCaseOpen: "EXPIRED_CASE_OPEN",
    FailedCaseOpen: "FAILED_CASE_OPEN"
  },
  diceStatuses: {
    Active: "ACTIVE",
    Completed: "COMPLETED"
  },
  itemTypes: {
    Amazon: "AMAZON",
    Steam: "STEAM",
    Stockx: "STOCKX",
    Lootie: "LOOTIE",
    Red_Bubble: "RED_BUBBLE",
    Other: "OTHER"
  },
  emailTemplateTypes: {
    Text: "TEXT",
    Html: "HTML"
  },
  userTypes: {
    Admin: "ADMIN",
    Influencer: "INFLUENCER",
    Influencer1: "INFLUENCER1",
    Influencer2: "INFLUENCER2",
    User: "USER"
  },
  referralOpTypes: {
    STEAM_DEPOSIT: "Steam deposit",
    COINPAYMENTS_DEPOSIT: "CoinPayments deposit",
    G2A_DEPOSIT: "G2A Pay deposit",
    COINBASE_DEPOSIT: "Coinbase deposit",
    PAYOP_DEPOSIT: "Payop deposit",
    GIFTCODE_DEPOSIT: "Giftcode deposit"
  },
  MIN_ORDERED_ITEMS_LENGTH: 90,
  userStatuses: {
    Online: "ONLINE",
    Offline: "OFFLINE",
    Disabled: "DISABLED",
    Pending: "PENDING"
  },
  winChanceDirections: {
    Up: "UP",
    Down: "DOWN"
  },
  upgradeStatuses: {
    Win: "WIN",
    Lose: "LOSE"
  },
  UNBOX_HOUSE_EDGE: 10,
  UPGRADE_HOUSE_EDGE: 5,
  ITEM_COLOR_MAPPING: [
    { name: "Common", value: 0, color: "#d6d6d6" },
    { name: "Uncommon", value: 2.5, color: "#4b69ff" },
    { name: "Rare", value: 10, color: "#8847ff" },
    { name: "Epic", value: 20, color: "#d32ee6" },
    { name: "Exotic", value: 100, color: "#eb4b4b" },
    { name: "Legendary", value: 2000, color: "#ffd700" }
  ],
  shippingCountries: COUNTRIES,
  withdrawalTypes: {
    RealWorld: "REAL_WORLD"
    // WAX: "wax",
  },
  withdrawalStatuses: {
    Pending: 'PENDING',
    Direct: 'DIRECT',
    MyUS: 'MYUS'
  },
  // https://docs.aftership.com/api/4/delivery-status
  deliveryStatuses: {
    InfoReceived: "Info Received",
    InTransit: "In Transit",
    OutForDelivery: "Out for Delivery",
    FailedAttempt: "Failed Attempt",
    Delivered: "Delivered",
    Exception: "Exception",
    Expired: "Expired",
    Pending: "Pending"
  },
  sortDirections: {
    asc: 1,
    desc: -1
  },
  crawlTypes : {
      OfferList: 'OFFER_LIST',
      Detail: 'DETAIL'
  },
  rewardCodeTypes: {
    FreeBox: 'FREE_BOX'
  },
  uploadImageTypes: {
    CaseImage: 'case-images',
    ItemImage: 'item-images'
  },
  battleStatuses: {
    Pending: 'PENDING',
    Running: 'RUNNING',
    Completed: 'COMPLETED',
    Cancelled: 'CANCELLED'
  },
  orderStatuses: {
    Pending: 'PENDING',
    // for Direct
    WaitingDirectTracking: 'WAITING_DIRECT_TRACKING',
    // for MyUS
    WaitingStockxTracking: 'WAITING_STOCKX_TRACKING',
    ShippingToMyUS: 'SHIPPING_TO_MYUS',
    WaitingMyUS: 'WAITING_MYUS',
    WaitingMyUSTracking: 'WAITING_MYUS_TRACKING',
    Completed: 'COMPLETED'
  }
};
