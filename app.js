import "./config/env.js";  

import express from "express";
import session from "express-session";
import passport from "./config/passport.js";
import userRouter from "./routers/userRouter.js";
import adminRouter from "./routers/adminRouter.js"
import connectDB from "./config/db_config.js";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

app.use(passport.initialize());
// app.use(passport.session());

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});


app.set("view engine", "ejs");
app.use("/", userRouter);
app.use('/admin',adminRouter)

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});