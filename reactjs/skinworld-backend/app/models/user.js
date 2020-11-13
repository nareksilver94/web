// grab the mongoose module
const mongoose = require("mongoose");
const { userTypes, userStatuses } = require("../constants");
const shippingAddress = require("./schema-types/shipping-address");
const logger = require("../modules/logger.js");
const slugify = require("mongoose-slug-generator");

const rewardBase = {
  claimed: {
    type: Boolean,
    default: false
  }
};

const rewards = {
  twitter: rewardBase,
  facebook: rewardBase,
  discord: rewardBase,
  email: rewardBase
};

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(userTypes),
      default: userTypes.User
    },
    password: String,
    profileImageUrl: String,
    google: {
      id: {
        type: String,
      },
      token: String
    },
    steam: {
      id: {
        type: String,
      },
      tradeUrl: String
    },
    twitter: {
      id: {
        type: String,
      },
      oauth_token: String,
      oauth_token_secret: String
    },
    facebook: {
      id: {
        type: String,
      }
    },
    discord: {
      id: {
        type: String,
      }
    },
    emailSubscription: {
      type: Boolean,
      default: false
    },
    rewards,
    opskins: {
      id: String,
      token: String,
      refreshToken: String,
      secret: String
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    lastDailyCaseOpened: Date,
    balance: {
      type: Number,
      default: 0
    },
    referredUserCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: Object.values(userStatuses),
      default: userStatuses.Offline
    },
    // whose referral code user applied
    referredBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
    },
    referralCode: {
      type: String,
      slug: "username",
      unique_slug: true,
      permanent: true,
    },
    // total earned on referral program
    totalReferralFee: {
      type: Number,
      default: 0
    },
    referralLevel: {
      type: Number,
      default: 1
    },
    availableReferralFee: {
      type: Number,
      default: 0
    },
    caseEarnings: {
      type: Number,
      default: 0
    },
    shippingAddress: Object,
    ip: String,
    tosApproved: {
      type: Boolean,
      default: false
    },
    unboxedCases: {
      type: Number,
      default: 0
    },
    upgradedItems: {
      type: Number,
      default: 0
    },
    depositedValue: {
      type: Number,
      default: 0
    },
    hasFreeboxOpened: {
      type: Boolean
    },
    // used promo codes
    promocodes: [
      {
        type: mongoose.Types.ObjectId,
        ref: "promocodes"
      }
    ],
    chatMuteInfo: {
      minute: Number,
      timestamp: Date
    },
    isEmailInvalid: {
      type: Boolean,
      default: false,
    },
    testing: Boolean
  },
  {
    timestamps: true,
    versionKey: false,
    autoIndex: process.env.CREATE_MONGO_INDEXES === '1',
  }
);

userSchema.index({ username: 1 });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ referralCode: 1 }, { unique: true });
userSchema.index({ email: 'text', username: 'text', referralCode: 'text', ip: 'text' });
userSchema.index({ createdAt: 1 });
userSchema.index({ updatedAt: 1 });

userSchema.index({
  'steam.id': 1,
}, {
  partialFilterExpression: {
    steam: {
      $exists: true,
    },
  },
  unique: true,
});

userSchema.index({
  'google.id': 1,
}, {
  partialFilterExpression: {
    google: {
      $exists: true,
    },
  },
  unique: true,
});

userSchema.index({
  'facebook.id': 1,
}, {
  partialFilterExpression: {
    facebook: {
      $exists: true,
    },
  },
  unique: true,
});

userSchema.index({
  'twitter.id': 1,
}, {
  partialFilterExpression: {
    twitter: {
      $exists: true,
    },
  },
  unique: true,
});

userSchema.index({
  'discord.id': 1,
}, {
  partialFilterExpression: {
    discord: {
      $exists: true,
    },
  },
  unique: true,
});

userSchema.plugin(slugify);

const User = mongoose.model("users", userSchema);

User.on('index', (err) => {
  if (err !== void 0) {
    logger.error(`Error while creating index for User model, err: ${err}`);
  }
});

module.exports = User;
