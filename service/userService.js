// import bcrypt from "bcrypt";
// import { userModel } from "../model/usermodel.js";
// import { sendOtpEmail } from "../utilites/otp.js";

// export const registerService = async (fullName,email,password,phoneNumber) => {
//   try {
    
//     if (!fullName || !email || !password || !phoneNumber) {
//       return { success: false, message: "All fields are required" };
//     }

//     const emailExists = await userModel.findOne({ email: email.toLowerCase() });
//     if (emailExists) {
//       return { success: false, message: "Email already exists" };
//     }

//     const phoneExists = await userModel.findOne({ phoneNumber: phoneNumber });
//     if (phoneExists) {
//       return { success: false, message: "Phone number already exists" };
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newUser = new userModel({
//       fullName,
//       email: email.toLowerCase(),
//       password: hashedPassword,
//       phoneNumber: phoneNumber,
//       status: "active",
//     });

//     await newUser.save();

//     return { success: true, message: "REGISTER SUCCESS" };
//   } catch (e) {
//     console.log("DB ERROR:", e);
//     return { success: false, message: "SERVER ERROR" };
//   }
// };

// export const userLoginLogic = async (req, email, password) => {
//   try {
//     email = email.trim().toLowerCase();
//     password = password.trim();

//     const user = await userModel.findOne({ email });

//     if (!user) {
//       return {
//         success: false,
//         field: "email",
//         message: "Email is incorrect",
//       };
//     }

//     const isMatch = await bcrypt.compare(password, user.password);

//     if (!isMatch) {
//       return {
//         success: false,
//         field: "password",
//         message: "Password is incorrect",
//       };
//     }

//     req.session.user = {
//       id: user._id,
//       email: user.email,
//       fullName: user.fullName,
//     };

//     return { success: true };
//   } catch (err) {
//     console.log(err);
//     return {
//       success: false,
//       field: "password",
//       message: "Server error",
//     };
//   }
// };




// export async function generateAndSendOtp(req, email) {




//   const otp = Math.floor(1000 + Math.random() * 9000);

//   req.session.otp = otp;
//   req.session.email = email; 
//   req.session.otpExpires = Date.now() + 60 * 1000;

//   console.log("Generated OTP:", otp);

//   await sendOtpEmail(email, otp);
    
  
// }

// export const resetPasswordService = async (email, password) => {
//   const hashed = await bcrypt.hash(password, 10);

//   const result = await userModel.updateOne(
//     { email: email.toLowerCase() },
//     { $set: { password: hashed } }
//   );

 

//   return { success: true };
// };


// export async function verifyOtpService(req) {
//   const otp = req.body.otp ? String(req.body.otp).trim() : null;
//   const sessionOtp = req.session.otp ? String(req.session.otp).trim() : null;

//   if (!otp) {
//     return { valid: false, message: "OTP is required" };
//   }

//   if (!sessionOtp) {
//     return { valid: false, message: "OTP expired" };
//   }

//   if (!req.session.otpExpires || Date.now() > req.session.otpExpires) {
//     return { valid: false, message: "OTP expired" };
//   }

//   if (otp !== sessionOtp) {
//     return { valid: false, message: "Invalid OTP" };
//   }

//   return { valid: true };
// }










// new


import bcrypt from "bcrypt";
import { userModel } from "../model/usermodel.js";
import { sendOtpEmail } from "../utilites/otp.js";

// ─── REGISTER ───────────────────────────────────────────────────────
export const registerService = async (fullName, email, password, phoneNumber) => {
  try {
    if (!fullName || !email || !password || !phoneNumber) {
      return { success: false, message: "All fields are required" };
    }

    const emailExists = await userModel.findOne({ email: email.toLowerCase() });
    if (emailExists) return { success: false, message: "Email already exists" };

    const phoneExists = await userModel.findOne({ phoneNumber });
    if (phoneExists) return { success: false, message: "Phone number already exists" };

    const hashedPassword = await bcrypt.hash(password, 10);

    await userModel.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phoneNumber,
      status: "active",
    });

    return { success: true, message: "Register success" };
  } catch (err) {
    console.error("registerService error:", err);
    return { success: false, message: "Server error" };
  }
};

// ─── LOGIN ──────────────────────────────────────────────────────────
export const userLoginLogic = async (req, email, password) => {
  try {
    const user = await userModel.findOne({ email: email.trim().toLowerCase() });

    if (!user) return { success: false, field: "email", message: "Email is incorrect" };

    if (user.isBlocked) return { success: false, field: "email", message: "Account is blocked" };

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) return { success: false, field: "password", message: "Password is incorrect" };

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

// ─── OTP ────────────────────────────────────────────────────────────
export const generateAndSendOtp = async (req, email) => {
  
  try {
    const otp = Math.floor(1000 + Math.random() * 9000);
    req.session.otp        = String(otp);
    req.session.otpExpires = Date.now() + 60 * 1000;
    console.log("Generated OTP:", otp);
    await sendOtpEmail(email, otp);
  } catch (err) {
    console.error("generateAndSendOtp error:", err);
    throw err;
  }
};

export const verifyOtpService = (req) => {
  
  
  const otp        = req.body.otp ? String(req.body.otp).trim() : null;
  const sessionOtp = req.session.otp ? String(req.session.otp).trim() : null;

  if (!otp)        return { valid: false, message: "OTP is required" };
  if (!sessionOtp) return { valid: false, message: "OTP expired. Request a new one" };

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
      { $set: { password: hashed } }
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
    if (!user) return { success: false, message: "No account found with this email" };

    req.session.email      = email;
    req.session.otpContext = "RESET_PASSWORD";

    await generateAndSendOtp(req, email);

    return { success: true, redirect: "/otp" };
  } catch (err) {
    console.error("verifyEmailService error:", err);
    return { success: false, message: "Server error" };
  }
};

// ─── REGISTER — pre-check (signup page validation) ──────────────────
export const registerPreCheckService = async (req, fullName, email, password, phoneNumber) => {
  try {
    if (!fullName || !email || !password || !phoneNumber) {
      return { success: false, message: "All fields are required" };
    }

    const emailExists = await userModel.findOne({ email: email.toLowerCase() });
    if (emailExists) return { success: false, message: "Email already exists" };

    const phoneExists = await userModel.findOne({ phoneNumber });
    if (phoneExists) return { success: false, message: "Phone number already exists" };

    req.session.tempUser   = { fullName, email, password, phoneNumber };
    req.session.tempEmail  = email;
    req.session.otpContext = "REGISTER";

    await generateAndSendOtp(req, email);

    return { success: true, redirect: "/otp" };
  } catch (err) {
    console.error("registerPreCheckService error:", err);
    return { success: false, message: "Server error" };
  }
};

// ─── OTP VERIFY — flow handle ───────────────────────────────────────
export const handleOtpVerifyService = async (req) => {
  
  
  try {
   
    
    const otpResult = verifyOtpService(req);
    console.log(otpResult);
    
    if (!otpResult.valid) return { success: false, message: otpResult.message };

    const flow = req.session.otpContext;
 
 
 
    // REGISTER
    if (flow === "REGISTER") {
      const userData = req.session.tempUser;
      if (!userData) return { success: false, message: "Session expired. Please sign up again." };

      const result = await registerService(
        userData.fullName,
        userData.email,
        userData.password,
        userData.phoneNumber
      );

      if (!result.success) return { success: false, message: result.message };

      // Session clear
      req.session.otp        = null;
      req.session.otpExpires = null;
      req.session.otpContext = null;
      req.session.tempUser   = null;
      req.session.tempEmail  = null;

      return { success: true, message: "Account created!", redirect: "/login" };
    }

     // EMAIL EDIT
if (flow === "CHANGE_EMAIL") {
  
  console.log(req.session);
  const userId   = req.session.user?.id;
  const newEmail = req.session.tempEmail;
  console.log(userId);
  

  if (!userId || !newEmail) {
    return { success: false, message: "Session expired" };
  }

  await userModel.findByIdAndUpdate(userId, {
    email: newEmail.toLowerCase()
  });

  //  update session user
  req.session.user.email = newEmail.toLowerCase();
 //clear session
  req.session.otp           = null;
  req.session.otpExpires    = null;
  req.session.otpContext    = null;
  req.session.tempEmail  = null;

  return {
    success: true,
    message: "Email updated success fully!",
    redirect: "/profile"
  };
}



    // RESET PASSWORD
    if (flow === "RESET_PASSWORD") {
      
      await userModel.findOneAndUpdate(
        { email: req.session.email },
        { isVerified: true }
      );
      return { success: true, redirect: "/reset-password" };
    }

    return { success: false, message: "Invalid flow" };
  } catch (err) {
    console.error("handleOtpVerifyService error:", err);
    return { success: false, message: "Server error" };
  }
 
};

// ─── RESET PASSWORD — page load check ───────────────────────────────
export const canLoadResetPassword = async (req) => {
  try {
    if (!req.session.email) return false;
    const user = await userModel.findOne({ email: req.session.email });
    return !!(user && user.isVerified);
  } catch {
    return false;
  }
};

// ─── RESEND OTP ──────────────────────────────────────────────────────
export const resendOtpService = async (req) => {
  try {
    const email = req.session.tempEmail || req.session.email;
    if (!email) return { success: false, message: "Session expired. Please start over." };

    await generateAndSendOtp(req, email);
    return { success: true, message: "OTP resent successfully" };
  } catch (err) {
    console.error("resendOtpService error:", err);
    return { success: false, message: "Server error" };
  }
};