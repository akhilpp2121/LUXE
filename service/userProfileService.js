
// import { userModel } from "../model/usermodel.js";
// import { generateAndSendOtp } from "./userService.js";



// export async function editUserProfileService(userId, type, value, req) {
//   if (!userId) {
//     return { success: false, message: "User not authenticated" };
//   }

//   const user = await userModel.findById(userId);
//   if (!user) {
//     return { success: false, message: "User not found" };
//   }

  
//   // NAME UPDATE
  
//   if (type === "name") {
//     if (!value || value.trim().length < 3) {
//       return { success: false, message: "Name too short" };
//     }

//     user.fullName = value.trim();
//     await user.save();

//     return {
//       success: true,
//       fullName: user.fullName,
//       redirect: "/profile"
//     };
//   }

//   // EMAIL UPDATE (OTP FLOW)
//   if (type === "email") {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//     if (!emailRegex.test(value)) {
//       return { success: false, message: "Invalid email" };
//     }

//     const newEmail = value.trim().toLowerCase();

//     const exists = await userModel.findOne({ email: newEmail });
//     if (exists && exists._id.toString() !== userId) {
//       return { success: false, message: "Email already in use" };
//     }

//     // store temp email for OTP
//     req.session.tempEmail = newEmail;
//     req.session.otpContext = "EMAIL_EDIT";

//     await generateAndSendOtp(req, newEmail);

//     return {
//       success: true,
//       redirect: "/otp"
//     };
//   }

//   return { success: false, message: "Invalid type" };
// }


// export const updateProfileService = async (req) => {
//   try {
//     const userId = req.session.user?.id;

//     if (!userId) {
//       return { success: false, message: "Not authenticated", redirect: "/login" };
//     }

//     const fullName = req.body?.fullName;
//     const phoneNumber = req.body?.phoneNumber;

//     const user = await userModel.findById(userId);

//     if (!user) {
//       return { success: false, message: "User not found", redirect: "/login" };
//     }

//     if (fullName && fullName.trim().length >= 3) {
//       user.fullName = fullName.trim();
//     }

//     if (phoneNumber) {
//       const phoneExists = await userModel.findOne({
//         phoneNumber,
//         _id: { $ne: userId }
//       });

//       if (phoneExists) {
//         return { success: false, message: "Phone already in use" };
//       }

//       user.phoneNumber = phoneNumber;
//     }

//     await user.save();

//     return {
//       success: true,
//       fullName: user.fullName,
//       phoneNumber: user.phoneNumber,
//       redirect: "/profile"
//     };

//   } catch (error) {
//     console.log("updateProfileService error:", error);
//     return { success: false, message: "Server error" };
//   }
// };

// export const getUserProfileService = async (userId) => {
//   if (!userId) return null;

//   const user = await userModel.findById(userId);

//   return user;
// };

// export async function editUserProfileService(userId, type, value) {
//   const user = await userModel.findById(userId);
//   if (!user) return { success: false, message: "User not found" };

//   if (type === "name") {
//     user.fullName = value.trim();
//   }

//   if (type === "phone") {
//     const exists = await userModel.findOne({
//       phoneNumber: value,
//       _id: { $ne: userId }
//     });

//     if (exists) {
//       return { success: false, message: "Phone already used" };
//     }

//     user.phoneNumber = value;
//   }

//   const saved = await user.save();

//   console.log("🔥 SAVED USER:", saved);

//   return {
//     success: true,
//     fullName: saved.fullName,
//     phoneNumber: saved.phoneNumber,
//     redirect: "/profile"
//   };
// }





//fresh


import { userModel } from "../model/usermodel.js";
import { generateAndSendOtp } from "./userService.js";
import path from "path";
import fs from "fs";

// ─── GET USER ───────────────────────────────────────────────────────
export const getUserProfileService = async (userId) => {
  if (!userId) return null;
  const user = await userModel.findById(userId);
  return user;
};




// ─── UPDATE PROFILE (name + phone + avatar) ────────────────────────
export const updateProfileService = async (req) => {
  try {
    console.log(req);
    
    const userId = req.session.user?.id;
    if (!userId) {
      return { success: false, message: "Not authenticated", redirect: "/login" };
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return { success: false, message: "User not found", redirect: "/login" };
    }
    console.log(req.body);
    console.log(req.file);
    
    

    const { fullName, phoneNumber, removeAvatar } = req.body;

    // ── NAME ──
    if (fullName && fullName.trim().length >= 3) {
      user.fullName = fullName.trim();
    } else if (fullName !== undefined) {
      return { success: false, message: "Full name must be at least 3 characters" };
    }

    // ── PHONE ──
    if (phoneNumber && phoneNumber.trim()) {
      const phoneExists = await userModel.findOne({
        phoneNumber: phoneNumber.trim(),
        _id: { $ne: userId },
      });
      if (phoneExists) {
        return { success: false, message: "Phone number already in use" };
      }
      user.phoneNumber = phoneNumber.trim();
    }

    // ── AVATAR: NEW UPLOAD ──
    if (req.file) {
      // Delete old avatar file from disk if it exists and isn't the default
      if (user.avatar && !user.avatar.includes("default-avatar")) {
        const oldPath = path.join("public", user.avatar);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      // Save new avatar path (relative, e.g. /uploads/avatars/filename.jpg)
      user.avatar = "/uploads/avatars/" + req.file.filename;
    }

    // ── AVATAR: REMOVE ──
    if (removeAvatar === "1") {
      if (user.avatar && !user.avatar.includes("default-avatar")) {
        const oldPath = path.join("public", user.avatar);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      user.avatar = ""; // or set to your default path string
    }

    await user.save();

    return {
      success: true,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      avatar: user.avatar,
      redirect: "/profile",
    };
  } catch (error) {
    console.error("updateProfileService error:", error);
    return { success: false, message: "Server error" };
  }
};

// ─── EDIT FIELD (name or phone individually) ───────────────────────
export async function editUserProfileService(userId, type, value) {
  const user = await userModel.findById(userId);
  if (!user) return { success: false, message: "User not found" };

  if (type === "name") {
    if (!value || value.trim().length < 3) {
      return { success: false, message: "Name must be at least 3 characters" };
    }
    user.fullName = value.trim();
  }

  if (type === "phone") {
    const exists = await userModel.findOne({
      phoneNumber: value,
      _id: { $ne: userId },
    });
    if (exists) {
      return { success: false, message: "Phone number already in use" };
    }
    user.phoneNumber = value;
  }

  const saved = await user.save();

  return {
    success: true,
    fullName: saved.fullName,
    phoneNumber: saved.phoneNumber,
    redirect: "/profile",
  };
}