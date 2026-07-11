import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { userModel } from "../model/usermodel.js";
import { applyReferralReward } from "../service/referalService.js";

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ── Google Strategy ──────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://www.akhilpp.co.in/auth/google/callback",
      passReqToCallback: true, // needed to read req.session.ref
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // 1. Existing user via googleId
        let user = await userModel.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // 2. Existing user via email -> link googleId
        user = await userModel.findOne({ email: profile.emails[0].value });
        if (user) {
          user.googleId = profile.id;
          user.avatar = user.avatar || profile.photos[0].value;
          await user.save();
          return done(null, user);
        }

        // 3. Brand new user
        const newUser = await userModel.create({
          googleId: profile.id,
          fullName: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
          isVerified: true,
        });

        // ── Apply referral reward (only on fresh signup) ──────────
        const refToken = req.session?.referralToken;
        console.log("Session ref value:", refToken);

        if (refToken) {
          await applyReferralReward(newUser, refToken);
          delete req.session.ref; // prevent reuse on next login
        }
        // ───────────────────────────────────────────────────────────

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

export default passport;
