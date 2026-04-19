// import { userModel } from "../model/usermodel.js";

// export const findUserByEmail = (email) => userModel.findOne({ email });

// export async function editUserNameLogicService(userId, type, value) {

//   if (!userId) {
//     return { success: false, message: "User not authenticated" };
//   }

//   const user = await userModel.findById(userId);

//   if (!user) {
//     return { success: false, message: "User not found" };
//   }

//   if (type === "name") {
//     if (!value || value.trim().length < 3) {
//       return { success: false, message: "Name too short" };
//     }

//     user.fullName = value.trim();
//     await user.save();

//     return {
//       success: true,
//       fullName: user.fullName
//     };
//   }

//   return { success: false, message: "Invalid type" };
// }

// export async function editEmailLogicService(userId, type, value) {

//   if (!userId) {
//     return { success: false, message: "User not authenticated" };
//   }

//   const user = await userModel.findById(userId);

//   if (!user) {
//     return { success: false, message: "User not found" };
//   }

//   if (type === "email") {

//     // ✅ validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//     if (!value || !emailRegex.test(value)) {
//       return { success: false, message: "Invalid email" };
//     }

//     const newEmail = value.trim().toLowerCase();

//     // ✅ check if email already exists
//     const existingUser = await userModel.findOne({ email: newEmail });

//     if (existingUser && existingUser._id.toString() !== userId) {
//       return { success: false, message: "Email already in use" };
//     }

//     // ✅ update email
//     user.email = newEmail;
//     await user.save();

//     return {
//       success: true,
//       email: user.email
//     };
//   }

//   return { success: false, message: "Invalid type" };
// }
import { userModel } from "../model/usermodel.js";
import { generateAndSendOtp } from "./userService.js";

export async function editUserProfileService(userId, type, value, req) {
  if (!userId) {
    return { success: false, message: "User not authenticated" };
  }

  const user = await userModel.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  // ======================
  // NAME UPDATE
  // ======================
  if (type === "name") {
    if (!value || value.trim().length < 3) {
      return { success: false, message: "Name too short" };
    }

    user.fullName = value.trim();
    await user.save();

    return {
      success: true,
      fullName: user.fullName,
      redirect: "/profile"
    };
  }

  // ======================
  // EMAIL UPDATE (OTP FLOW)
  // ======================
  if (type === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(value)) {
      return { success: false, message: "Invalid email" };
    }

    const newEmail = value.trim().toLowerCase();

    const exists = await userModel.findOne({ email: newEmail });
    if (exists && exists._id.toString() !== userId) {
      return { success: false, message: "Email already in use" };
    }

    // store temp email for OTP
    req.session.tempEmail = newEmail;
    req.session.otpContext = "EMAIL_EDIT";

    await generateAndSendOtp(req, newEmail);

    return {
      success: true,
      redirect: "/otp"
    };
  }

  return { success: false, message: "Invalid type" };
}
