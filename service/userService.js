import bcrypt from "bcrypt";
import { userModel } from "../model/usermodel.js";
import { sendOtpEmail } from "../utilites/otp.js";

export const registerService = async (fullName,email,password,phoneNumber) => {
  try {
    
    if (!fullName || !email || !password || !phoneNumber) {
      return { success: false, message: "All fields are required" };
    }

    const emailExists = await userModel.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return { success: false, message: "Email already exists" };
    }

    const phoneExists = await userModel.findOne({ phoneNumber: phoneNumber });
    if (phoneExists) {
      return { success: false, message: "Phone number already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new userModel({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phoneNumber: phoneNumber,
      status: "active",
    });

    await newUser.save();

    return { success: true, message: "REGISTER SUCCESS" };
  } catch (e) {
    console.log("DB ERROR:", e);
    return { success: false, message: "SERVER ERROR" };
  }
};

export const userLoginLogic = async (req, email, password) => {
  try {
    email = email.trim().toLowerCase();
    password = password.trim();

    const user = await userModel.findOne({ email });

    if (!user) {
      return {
        success: false,
        field: "email",
        message: "Email is incorrect",
      };
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return {
        success: false,
        field: "password",
        message: "Password is incorrect",
      };
    }

    req.session.user = {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
    };

    return { success: true };
  } catch (err) {
    console.log(err);
    return {
      success: false,
      field: "password",
      message: "Server error",
    };
  }
};




export async function generateAndSendOtp(req, email) {




  const otp = Math.floor(1000 + Math.random() * 9000);

  req.session.otp = otp;
  req.session.email = email; 
  req.session.otpExpires = Date.now() + 60 * 1000;

  console.log("Generated OTP:", otp);

  await sendOtpEmail(email, otp);
    
  
}

export const resetPasswordService = async (email, password) => {
  const hashed = await bcrypt.hash(password, 10);

  const result = await userModel.updateOne(
    { email: email.toLowerCase() },
    { $set: { password: hashed } }
  );

 

  return { success: true };
};


export async function verifyOtpService(req) {
  const otp = req.body.otp ? String(req.body.otp).trim() : null;
  const sessionOtp = req.session.otp ? String(req.session.otp).trim() : null;

  if (!otp) {
    return { valid: false, message: "OTP is required" };
  }

  if (!sessionOtp) {
    return { valid: false, message: "OTP expired" };
  }

  if (!req.session.otpExpires || Date.now() > req.session.otpExpires) {
    return { valid: false, message: "OTP expired" };
  }

  if (otp !== sessionOtp) {
    return { valid: false, message: "Invalid OTP" };
  }

  return { valid: true };
}
