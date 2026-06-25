import "./config/env.js";
import express from "express";
import session from "express-session";
import passport from "./config/passport.js";
import userRouter from "./routers/userRouter.js";
import adminRouter from "./routers/adminRouter.js";
import cartRouter from './routers/cartRouter.js';
import checkoutRouter from "./routers/checkoutRouter.js";
import orderRouter from "./routers/orderRouter.js";
import connectDB from "./config/db_config.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import path from "path";
import { fileURLToPath } from "url";
import MongoStore from "connect-mongo";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");                        
app.set("views", path.join(__dirname, "views"));

// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: true,
//   saveUninitialized: false,
//   rolling: true,
//   cookie: {
//     httpOnly: true,
//     secure: false,
//     sameSite: "lax",
//     maxAge: 1000 * 60 * 60 * 24 * 7,
//   },
// }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: false,
  rolling: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
  }),
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.use((req, res, next) => {
  if (req.query.ref) {
    req.session.referralToken = req.query.ref;
  }
  next();
});

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use("/cart", cartRouter);
app.use("/checkout", checkoutRouter);
app.use("/order", orderRouter);

if (process.env.NODE_ENV !== "production") {
  const { default: testRoutes } = await import("./routers/testRouter.js");
  app.use("/error-test", testRoutes);
}

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});