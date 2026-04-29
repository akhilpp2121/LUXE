

import {
  userLoginLogic,
  resetPasswordService,
  verifyEmailService,
  registerPreCheckService,
  handleOtpVerifyService,
  canLoadResetPassword,
  resendOtpService,
} from "../service/userService.js";

export const userLandingLoad = (req, res) => {
  if (req.session.user) return res.redirect("/homePage");
  return res.render("Users/LandingPage");
};

export const userLoginLoad = (req, res) => {
  if (req.session.user) return res.redirect("/homePage");
  return res.render("Users/login", { message: null });
};

export const userSignUpLoad = (req, res) => {
  if (req.session.user) return res.redirect("/homePage");
  return res.render("Users/signUp", { message: null });
};

export const userForgotPasswordLoad = (req, res) => {
  return res.render("Users/emailVerification");
};

export const otpPageLoad = (req, res) => {
  const email = req.session.email || req.session.tempEmail;
  if (!email) return res.redirect("/login");
  return res.render("Users/otpPage", { email });
};

export const homeLoad = (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  return res.render("Users/homePage", { user: req.session.user });
};

export const registerController = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password } = req.body;
    const result = await registerPreCheckService(req, fullName, email, password, phoneNumber);

    if (!result.success) {
      return res.render("Users/signUp", { message: result.message });
    }

    return res.redirect(result.redirect);
  } catch (err) {
    console.error("registerController error:", err);
    return res.render("Users/signUp", { message: "Server error. Please try again." });
  }
};

export const loginController = async (req, res) => {
  try {
    const result = await userLoginLogic(req, req.body.email, req.body.password);

    if (!result.success) {
      return res.status(401).json({ success: false, message: result.message, field: result.field });
    }

    return res.json({ success: true, redirect: "/homePage" });
  } catch (err) {
    console.error("loginController error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export async function googleCallback(req, res) {
  try {
    const user = req.user;

    req.session.user = {
      id:          user._id,
      fullName:    user.fullName,
      email:       user.email,
      avatar:      user.avatar,
      phoneNumber: user.phoneNumber || "",
    };

    return res.redirect("/homePage");

  } catch (err) {
    console.error("googleCallback error:", err);
    return res.redirect("/login");
  }
}

export const verifyEmailController = async (req, res) => {
  try {
    
    
    const result = await verifyEmailService(req, req.body.email);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error("verifyEmailController error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const verifyOtpController = async (req, res) => {
  try {
    const result = await handleOtpVerifyService(req);
    
    
    
    return res.json(result);
  } catch (err) {
    console.error("verifyOtpController error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};

export const resetPasswordLoad = async (req, res) => {
  try {
    const allowed = await canLoadResetPassword(req);
    if (!allowed) return res.redirect("/login");
    return res.render("Users/resetPassword");
  } catch (err) {
    console.error("resetPasswordLoad error:", err);
    return res.redirect("/login");
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const email = req.session.email;

    if (!email) return res.json({ success: false, message: "Session expired" });

    if (password !== confirmPassword) {
      return res.json({ success: false, message: "Passwords do not match" });
    }

    const result = await resetPasswordService(email, password);
    if (!result.success) return res.json(result);

    req.session.email      = null;
    req.session.otpContext = null;

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};

export const resendOtpController = async (req, res) => {
  try {
    const result = await resendOtpService(req);
    return res.json(result);
  } catch (err) {
    console.error("resendOtpController error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};
export const logoutUserController = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/homePage");
    }

    res.clearCookie("connect.sid");

    return res.redirect("/login");
  });
};
