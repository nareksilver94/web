const jwt = require("jsonwebtoken");
const config = require("../../../config");

const { OAuth2Client } = require("google-auth-library");
const GOOGLE_CLIENT_ID = config.app.googleClientId;
const OAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const HOST = config.app.host;
const PORT = config.app.port;
const passport = require("passport");

const STEAM_API_KEY = config.app.steamApiKey;
const SteamStrategy = require("passport-steam").Strategy;

const OPSKINS_API_KEY = config.app.opskinsApiKey;
const OpskinsStrategy = require("passport-opskins").Strategy;

const FACEBOOK_CLIENT_ID = config.app.fbAppId;
const FACEBOOK_CLIENT_SECRET = config.app.fbAppSecret;
const FacebookStrategy = require("passport-facebook").Strategy;

const issueToken = async (payload, customExpiresIn) => {
  try {
    const secret = config.app.jwtSecret,
      expiresIn = customExpiresIn || config.app.jwtExpiresIn,
      algorithm = config.app.jwtAlgorithm;

    let token = await jwt.sign(payload, secret, { expiresIn, algorithm });
    return token;
  } catch (error) {
    throw error;
  }
};

const verifyToken = async accessToken => {
  try {
    const secret = config.app.jwtSecret,
      algorithm = config.app.jwtAlgorithm;

    let token = await jwt.verify(accessToken, secret, { algorithm });
    return token;
  } catch (error) {
    throw error;
  }
};

const verifyGoogleIdTokenAndReturnPayload = async idToken => {
  try {
    // https://developers.google.com/identity/sign-in/web/backend-auth
    let ticket = await OAuthClient.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID
    });

    return ticket.getPayload();
  } catch (error) {
    throw error;
  }
};

passport.serializeUser((user, done) => {
  done(null, user._json || user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(
  "steam",
  new SteamStrategy(
    {
      returnURL: `http://${HOST}:${PORT}/v1/users/authenticate/steam/return`,
      realm: `http://${HOST}:${PORT}/`,
      apiKey: STEAM_API_KEY
    },
    (identifier, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.use(
  "facebook",
  new FacebookStrategy(
    {
      clientID: FACEBOOK_CLIENT_ID,
      clientSecret: FACEBOOK_CLIENT_SECRET,
      callbackURL: `https://${HOST}/v1/users/authenticate/fb/return`,
      profileFields: ["email", "name"]
    },
    function(accessToken, refreshToken, profile, done) {
      done(null, profile);
    }
  )
);

// passport.use(
//   'opskins',
//   new OpskinsStrategy(
//     {
//       name: 'Skinworld',
//       returnURL: `http://${HOST}:${PORT}/v1/users/authenticate/opskins/return`,
//       scopes: 'identity_basic',
//       mobile: true,
//       permanent: true,
//       apiKey: OPSKINS_API_KEY
//     },
//     (profile, done) => {
//       return done(null, profile);
//     }
//   )
// );

module.exports = {
  issueToken: issueToken,
  verifyToken: verifyToken,
  verifyGoogleIdTokenAndReturnPayload: verifyGoogleIdTokenAndReturnPayload,
  passport: passport
};
