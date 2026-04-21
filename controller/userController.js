// import { userModel } from "../model/usermodel.js"; 
// import {
//   registerService,
//   userLoginLogic,
//   resetPasswordService,
//   verifyOtpService,
//   generateAndSendOtp,
// } from "../service/userService.js";

// export async function userLandingLoad(req, res) {
//   try {
//     if (req.session.user) return res.redirect("/homePage");
//     return res.render("Users/LandingPage");
//   } catch (error) {
//     console.log("Server error ", error);
//     return res.redirect("/login");
//   }
// }

// export async function userLoginLoad(req, res) {
//   try {
//     if (req.session?.user) return res.redirect("/homePage");
//     return res.render("Users/login", { message: null });
//   } catch (error) {
//     console.error("Login page load error:", error);
//     return res.status(500).render("Users/login", {
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// }

// export async function userSignUpLoad(req, res) {
//   try {
//     if (req.session.user) return res.redirect("/homePage");
//     return res.render("Users/signUp", { message: null });
//   } catch (error) {
//     console.log(error);
//     res.redirect("/");
//   }
// }

// export async function userForgotPasswordLoad(req, res) {
//   try {
//     return res.render("Users/emailVerification");
//   } catch (error) {
//     console.log(error);
//     res.redirect("Users/login");
//   }
// }

// export async function otpPageLoad(req, res) {
//   try {
//     if (!req.session.email && !req.session.tempEmail) {
//       return res.redirect("/login");
//     }
//     const email = req.session.email || req.session.tempEmail;
//     return res.render("Users/otpPage", { email });
//   } catch (error) {
//     console.log(error);
//     return res.redirect("/login");
//   }
// }

// export const registerController = async (req, res) => {
//   try {
//     const { fullName, email, phoneNumber, password } = req.body;

    
//     if (!fullName || !email || !password || !phoneNumber) {
//       return res.render("Users/signUp", { message: "All fields are required" });
//     }

//     const emailExists = await userModel.findOne({ email: email.toLowerCase() });
//     if (emailExists) {
//       return res.render("Users/signUp", { message: "Email already exists" });
//     }

//     const phoneExists = await userModel.findOne({ phoneNumber });
//     if (phoneExists) {
//       return res.render("Users/signUp", { message: "Phone number already exists" });
//     }

//     // Store user data in session — save to DB only AFTER OTP verified
//     req.session.tempUser = { fullName, email, password, phoneNumber };
//     req.session.tempEmail = email;
//     req.session.otpContext = "REGISTER";

//     await generateAndSendOtp(req, email);

//     return res.redirect("/otp");
//   } catch (error) {
//     console.log(error);
//     return res.render("Users/signUp", { message: "Server error. Please try again." });
//   }
// };

// export const loginController = async (req, res) => {
//   try {
//     const result = await userLoginLogic(req, req.body.email, req.body.password);
//     if (!result.success) {
//       req.session.user = null;
//       return res.status(401).json({ success: false, message: result.message, field: result.field });
//     }
//     return res.status(200).json({ success: true, redirect: "/homePage" });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// export const homeLoad = (req, res) => {
//   try {
//     if (!req.session.user) return res.redirect("/login");
//     return res.render("Users/homePage", { user: req.session.user });
//   } catch (err) {
//     console.log(err);
//     return res.redirect("/login");
//   }
// };

// export async function verifyEmailController(req, res) {
//   try {
//     const { email } = req.body;
//     if (!email || !email.includes("@")) {
//       return res.status(400).json({ success: false, message: "Invalid email" });
//     }

//     const user = await userModel.findOne({ email: email.toLowerCase() });
//     if (!user) {
//       return res.status(404).json({ success: false, message: "No account found with this email" });
//     }

//     req.session.email = email;
//     req.session.otpContext = "RESET_PASSWORD"; 
//     await generateAndSendOtp(req, email);

//     return res.json({ success: true, redirect: "/otp" });
//   } catch (error) {
//     console.log(error);
//     return res.redirect("/login");
//   }
// }

// export const verifyOtpController = async (req, res) => {
//   try {
//     const result = await verifyOtpService(req);

//     if (!result.valid) {
//       return res.json({ success: false, message: result.message });
//     }

//     const flow = req.session.otpContext;

//     //  REGISTER — create user NOW after OTP verified
//     if (flow === "REGISTER") {
//       const userData = req.session.tempUser;

//       if (!userData) {
//         return res.json({ success: false, message: "Session expired. Please sign up again." });
//       }

//       const register = await registerService(
//         userData.fullName,
//         userData.email,
//         userData.password,
//         userData.phoneNumber
//       );

//       if (!register.success) {
//         return res.json({ success: false, message: register.message });
//       }

//       // Clear all registration session data
//       req.session.otp = null;
//       req.session.otpExpires = null;
//       req.session.otpContext = null;
//       req.session.tempUser = null;
//       req.session.tempEmail = null;

//       return res.json({ success: true, message: "Account created!", redirect: "/login" });
//     }

//     // EMAIL UPDATE — userModel now imported at top
//     if (flow === "EMAIL_EDIT") {
//       const userId = req.session.user?.id;
//       const newEmail = req.session.tempEmail;

//       if (!userId || !newEmail) {
//         return res.json({ success: false, message: "Session expired" });
//       }

//       const user = await userModel.findById(userId)
     
//       if (!user) {
//         return res.json({ success: false, message: "User not found" });
//       }

//       user.email = newEmail.toLowerCase();
//       await user.save();

//       //  Also update the session so UI reflects new email
//       req.session.user.email = newEmail.toLowerCase();

//       req.session.otp = null;
//       req.session.otpExpires = null;
//       req.session.otpContext = null;
//       req.session.tempEmail = null;

//       return res.json({ success: true, message: "Email updated!", redirect: "/profile" });
//     }

//     // RESET PASSWORD
//     if (flow === "RESET_PASSWORD") {
//       return res.json({ success: true, redirect: "/reset-password" });
//     }

//     return res.json({ success: false, message: "Invalid flow" });
//   } catch (error) {
//     console.log(error);
//     return res.json({ success: false, message: "Server error" });
//   }
// };

// export async function resetPasswordLoad(req, res) {
//   try {

//     let isvalid= await userModel.findOne({email:req.session.email})
//     if (!req.session.email||!isvalid.isVerified) return res.redirect("/login");
    
//     res.render("Users/resetPassword");
//   } catch (err) {
//     console.log(err);
//     res.redirect("/login");
//   }
// }

// export const resetPassword = async (req, res) => {
//   try {
//     const { password, confirmPassword } = req.body;
//     const email = req.session.email;

//     if (!email) return res.json({ success: false, message: "Session expired" });
//     if (password !== confirmPassword) {
//       return res.json({ success: false, message: "Passwords do not match" });
//     }

//     await resetPasswordService(email, password);

//     req.session.email = null;
//     req.session.otpContext = null;

//     return res.json({ success: true, message: "Password updated successfully" });
//   } catch (err) {
//     console.log(err);
//     return res.json({ success: false, message: "Server error" });
//   }
// };

// // In userProfileController.js or userController.js (wherever your router points)
// export const resendOtpController = async (req, res) => {
//   try {
//     const email = req.session.tempEmail || req.session.email;

//     if (!email) {
//       return res.json({ success: false, message: "Session expired. Please start over." });
//     }

//     await generateAndSendOtp(req, email);

//     return res.json({ success: true, message: "OTP resent successfully" });
//   } catch (error) {
//     console.log(error);
//     return res.json({ success: false, message: "Server error" });
//   }
// };


// new

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