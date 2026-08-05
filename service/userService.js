import bcrypt from "bcrypt";
import { userModel } from "../model/usermodel.js";
import { sendOtpEmail } from "../utilites/otp.js";
import { applyReferralReward } from "./referalService.js";
import otpLogModel from "../model/otpLogModel.js";

export const findUserByEmail = (email) => userModel.findOne({ email });
export const findUserBlocked = (userId) => {
  return userModel.findOne({ _id: userId, isBlocked: true });
};

// ─── REGISTER ───────────────────────────────────────────────────────

export const registerService = async (
  fullName,
  email,
  password,
  phoneNumber,
) => {
  try {
    if (!fullName || !email || !password || !phoneNumber) {
      return { success: false, message: "All fields are required" };
    }

    const emailExists = await userModel.findOne({ email: email.toLowerCase() });
    if (emailExists) return { success: false, message: "Email already exists" };

    const phoneExists = await userModel.findOne({ phoneNumber });
    if (phoneExists)
      return { success: false, message: "Phone number already exists" };

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userModel.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phoneNumber,
      status: "active",
    });

    return { success: true, message: "Register success", user: newUser };
  } catch (err) {
    console.error("registerService error:", err);
    return { success: false, message: "Server error" };
  }
};
// ─── LOGIN ──────────────────────────────────────────────────────────
export const userLoginLogic = async (req, email, password) => {
  try {
    const user = await userModel.findOne({ email: email.trim().toLowerCase() });

    if (!user)
      return { success: false, field: "email", message: "Email is incorrect" };

    if (user.isBlocked)
      return { success: false, field: "email", message: "Your account has been blocked by admin." };

    // Account exists but has no password (e.g. created via Google) — can't login with password
    if (!user.password) {
      return {
        success: false,
        field: "email",
        message:
          "This account uses Google sign-in. Please log in with Google instead.",
      };
    }

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch)
      return {
        success: false,
        field: "password",
        message: "Password is incorrect",
      };

    req.session.user = {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar || "",
      phoneNumber: user.phoneNumber || "",
    };

    return { success: true };
  } catch (err) {
    console.error("userLoginLogic error:", err);
    return { success: false, field: "email", message: "Server error" };
  }
};


export const checkAndRecordOtpRequest = async (email) => {
  if (!email) return { allowed: false, message: "Email is required" };
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();
  const timeLimitMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 4;
  const cooldownMs = 60 * 1000; // 60 seconds

  let otpLog = await otpLogModel.findOne({ email: normalizedEmail });

  if (otpLog) {
    // 1. Check cooldown
    const timeSinceLast = now.getTime() - otpLog.lastRequestedAt.getTime();
    if (timeSinceLast < cooldownMs) {
      const remainingCooldown = Math.ceil((cooldownMs - timeSinceLast) / 1000);
      return {
        allowed: false,
        message: `Please wait ${remainingCooldown} seconds before requesting another OTP.`
      };
    }

    // 2. Check rolling window
    const cutoff = new Date(now.getTime() - timeLimitMs);
    const recentRequests = otpLog.requests.filter(reqTime => new Date(reqTime) > cutoff);

    if (recentRequests.length >= maxRequests) {
      const oldestRecent = new Date(recentRequests[0]);
      const waitTimeMs = oldestRecent.getTime() + timeLimitMs - now.getTime();
      const waitMinutes = Math.ceil(waitTimeMs / (60 * 1000));
      return {
        allowed: false,
        message: `Too many OTP requests. Please try again in ${waitMinutes} minutes.`
      };
    }

    // 3. Update existing log
    otpLog.requests = [...recentRequests, now];
    otpLog.lastRequestedAt = now;
    await otpLog.save();
  } else {
    // 4. Create new log
    otpLog = new otpLogModel({
      email: normalizedEmail,
      requests: [now],
      lastRequestedAt: now
    });
    await otpLog.save();
  }

  return { allowed: true };
};

// ─── OTP ────────────────────────────────────────────────────────────
export const generateAndSendOtp = async (req, email) => {
  try {
    const otp = Math.floor(1000 + Math.random() * 9000);
    req.session.otp = String(otp);
    req.session.otpExpires = Date.now() + 60 * 1000;
    console.log("Generated OTP:", otp);
    await sendOtpEmail(email, otp);
  } catch (err) {
    console.error("generateAndSendOtp error:", err);
    throw err;
  }
};

export const verifyOtpService = (req) => {
  const otp = req.body.otp ? String(req.body.otp).trim() : null;
  const sessionOtp = req.session.otp ? String(req.session.otp).trim() : null;

  if (!otp) return { valid: false, message: "OTP is required" };
  if (!sessionOtp)
    return { valid: false, message: "OTP expired. Request a new one" };

  if (!req.session.otpExpires || Date.now() > req.session.otpExpires) {
    return { valid: false, message: "OTP expired. Request a new one" };
  }

  if (otp !== sessionOtp) return { valid: false, message: "Invalid OTP" };

  return { valid: true };
};

// ─── RESET PASSWORD ─────────────────────────────────────────────────
export const resetPasswordService = async (email, password) => {
  try {
    const hashed = await bcrypt.hash(password, 10);
    await userModel.updateOne(
      { email: email.toLowerCase() },
      { $set: { password: hashed } },
    );
    return { success: true };
  } catch (err) {
    console.error("resetPasswordService error:", err);
    return { success: false, message: "Server error" };
  }
};

export const verifyEmailService = async (req, email) => {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, message: "Invalid email" };
    }

    const user = await userModel.findOne({ email: email.toLowerCase() });
    if (!user)
      return { success: false, message: "No account found with this email" };

    const otpLimit = await checkAndRecordOtpRequest(email);
    if (!otpLimit.allowed) {
      return { success: false, message: otpLimit.message };
    }

    req.session.email = email;
    req.session.otpContext = "RESET_PASSWORD";

    await generateAndSendOtp(req, email);

    return { success: true, redirect: "/otp" };
  } catch (err) {
    console.error("verifyEmailService error:", err);
    return { success: false, message: "Server error" };
  }
};



export const registerPreCheckService = async (
  req,
  fullName,
  email,
  password,
  confirmPassword,
  phoneNumber,
  referralCode,
) => {
  try {
    if (!fullName || !email || !password || !confirmPassword || !phoneNumber) {
      return { success: false, message: "All fields are required" };
    }

    if (password !== confirmPassword) {
      return { success: false, message: "Passwords do not match" };
    }

    const emailExists = await userModel.findOne({ email: email.toLowerCase() });
    if (emailExists) return { success: false, message: "Email already exists" };

    const phoneExists = await userModel.findOne({ phoneNumber });
    if (phoneExists)
      return { success: false, message: "Phone number already exists" };

    const otpLimit = await checkAndRecordOtpRequest(email);
    if (!otpLimit.allowed) {
      return { success: false, message: otpLimit.message };
    }

    req.session.tempUser = {
      fullName,
      email,
      password,
      phoneNumber,
      referralCode: referralCode || null,
    };
    req.session.tempEmail = email;
    req.session.otpContext = "REGISTER";

    await generateAndSendOtp(req, email);

    return { success: true, redirect: "/otp" };
  } catch (err) {
    console.error("registerPreCheckService error:", err);
    return { success: false, message: "Server error" };
  }
};

export const handleOtpVerifyService = async (req) => {
  try {
    const otpResult = verifyOtpService(req);
    console.log(otpResult);

    if (!otpResult.valid) return { success: false, message: otpResult.message };

    const flow = req.session.otpContext;

    // REGISTER
    if (flow === "REGISTER") {
      const userData = req.session.tempUser;
      if (!userData)
        return {
          success: false,
          message: "Session expired. Please sign up again.",
        };

      const result = await registerService(
        userData.fullName,
        userData.email,
        userData.password,
        userData.phoneNumber,
      );

      if (!result.success) return { success: false, message: result.message };

      if (userData.referralCode) {
        await applyReferralReward(result.user, userData.referralCode);
      }

      // Session clear
      req.session.otp = null;
      req.session.otpExpires = null;
      req.session.otpContext = null;
      req.session.tempUser = null;
      req.session.tempEmail = null;

      return {
        success: true,
        message: "Account created successfully. Please login.",
        redirect: "/login",
      };
    }

    // EMAIL EDIT
    if (flow === "CHANGE_EMAIL") {
      const userId = req.session.user?.id;
      const newEmail = req.session.tempEmail;

      if (!userId || !newEmail) {
        return { success: false, message: "Session expired" };
      }

      await userModel.findByIdAndUpdate(userId, {
        email: newEmail.toLowerCase(),
      });

      //  update session user
      req.session.user.email = newEmail.toLowerCase();
      //clear session
      req.session.otp = null;
      req.session.otpExpires = null;
      req.session.otpContext = null;
      req.session.tempEmail = null;

      req.session.flashMessage = {
        type: "success",
        text: "Email updated successfully!",
      };

      return {
        success: true,
        message: "Email updated successfully!",
        redirect: "/profile",
      };
    }

    // RESET PASSWORD
    if (flow === "RESET_PASSWORD") {
      await userModel.findOneAndUpdate(
        { email: req.session.email },
        { isVerified: true },
      );
      return {
        success: true,
        message: "Identity verified! ",
        redirect: "/reset-password",
      };
    }

    return { success: false, message: "Invalid flow" };
  } catch (err) {
    console.error("handleOtpVerifyService error:", err);
    return { success: false, message: "Server error" };
  }
};
export const canLoadResetPassword = async (req) => {
  try {
    if (!req.session.email) return false;
    const user = await userModel.findOne({ email: req.session.email });
    return !!(user && user.isVerified);
  } catch {
    return false;
  }
};

export const resendOtpService = async (req) => {
  try {
    const email = req.session.tempEmail || req.session.email;
    if (!email)
      return { success: false, message: "Session expired. Please start over." };

    const otpLimit = await checkAndRecordOtpRequest(email);
    if (!otpLimit.allowed) {
      return { success: false, message: otpLimit.message };
    }

    await generateAndSendOtp(req, email);
    return { success: true, message: "OTP resent successfully" };
  } catch (err) {
    console.error("resendOtpService error:", err);
    return { success: false, message: "Server error" };
  }
};
