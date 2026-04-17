import bcrypt from "bcrypt";
import { userModel } from "../model/usermodel.js";
import { sendOtpEmail } from "../utilites/otp.js";

export const registerService = async (userData) => {
  try {
    const { fullName, email, password, mobileno } = userData;

    if (!fullName || !email || !password || !mobileno) {
      return { success: false, message: "All fields are required" };
    }

    const emailExists = await userModel.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return { success: false, message: "Email already exists" };
    }

    const phoneExists = await userModel.findOne({ phoneNumber: mobileno });
    if (phoneExists) {
      return { success: false, message: "Phone number already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new userModel({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phoneNumber: mobileno,
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
  req.session.email = email; // IMPORTANT FIX
  req.session.otpExpires = Date.now() + 60 * 1000;

  console.log("Generated OTP:", otp);

  await sendOtpEmail(email, otp);
}

