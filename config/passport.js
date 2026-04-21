import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { userModel } from "../model/usermodel.js";

// ── Serialize / Deserialize ──────────────────────────────────────
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
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await userModel.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        user = await userModel.findOne({ email: profile.emails[0].value });
        if (user) {
          user.googleId = profile.id;
          user.avatar   = user.avatar || profile.photos[0].value;
          await user.save();
          return done(null, user);
        }

        const newUser = await userModel.create({
          googleId:   profile.id,
          fullName:   profile.displayName,
          email:      profile.emails[0].value,
          avatar:     profile.photos[0].value,
          isVerified: true,
        });

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;