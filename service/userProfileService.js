


import { userModel } from "../model/usermodel.js";
import path from "path";
import fs from "fs";

const deleteOldAvatar = (avatarPath) => {
  if (!avatarPath || avatarPath.includes("default-avatar")) return;
  const filePath = path.join(process.cwd(), "public", avatarPath.replace(/^\//, ""));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

// User data DB-ൽ നിന്ന് എടുക്കുക
export const getUserProfileService = async (userId) => {
  if (!userId) return null;
  return await userModel.findById(userId);
};

// Name + Phone update
export const updateProfileService = async (req) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return { success: false, message: "Not authenticated" };

    const user = await userModel.findById(userId);
    if (!user) return { success: false, message: "User not found" };

    const { fullName, phoneNumber } = req.body;

    // Name validate
    if (!fullName || fullName.trim().length < 3) {
      return { success: false, message: "Full name must be at least 3 characters" };
    }
    user.fullName = fullName.trim();

    // Phone validate
    if (phoneNumber && phoneNumber.trim()) {
      const cleaned = phoneNumber.trim();
      if (!/^\+?[0-9]{10,15}$/.test(cleaned.replace(/[\s\-()]/g, ""))) {
        return { success: false, message: "Enter a valid phone number" };
      }
      const phoneExists = await userModel.findOne({
        phoneNumber: cleaned,
        _id: { $ne: userId },
      });
      if (phoneExists) return { success: false, message: "Phone number already in use" };
      user.phoneNumber = cleaned;
    }

    await user.save();

    return {
      success: true,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      avatar: user.avatar,
    };
  } catch (error) {
    console.error("updateProfileService error:", error);
    return { success: false, message: "Server error" };
  }
};

// Avatar upload — controller-ൽ നിന്ന് logic ഇവിടേക്ക് മാറ്റി
export const uploadAvatarService = async (userId, file, currentAvatar) => {
  try {
    // പഴയ avatar delete
    deleteOldAvatar(currentAvatar);

    const newAvatarPath = "/uploads/avatars/" + file.filename;

   const user = await userModel.findByIdAndUpdate(
  userId,
  { avatar: newAvatarPath },
  { returnDocument: 'after' }
);

    return { success: true, avatar: user.avatar };
  } catch (error) {
    console.error("uploadAvatarService error:", error);
    return { success: false, message: "Server error" };
  }
};

// Avatar delete
export const deleteAvatarService = async (userId, currentAvatar) => {
  try {
    deleteOldAvatar(currentAvatar);

    await userModel.findByIdAndUpdate(userId, { avatar: "" });

    return { success: true };
  } catch (error) {
    console.error("deleteAvatarService error:", error);
    return { success: false, message: "Server error" };
  }
};