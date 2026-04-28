import { userModel } from "../model/userModel.js";
import dotenv from "dotenv";
dotenv.config();

export const verifyAdminLogin = (email, password) => {
  const adminEmail    = process.env.ADMIN;
  const adminPassword = process.env.PASSWORDADMIN;
  return email === adminEmail && password === adminPassword;
};

export const adminUsersLogic = async (filter, pageNo, sort) => {
  try {
    const page       = parseInt(pageNo) || 1;
    const limit      = 5;
    const skip       = (page - 1) * limit;
    const total      = await userModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const data = await userModel
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("fullName email phoneNumber isActive isBlocked status avatar createdAt");

    return {
      success: true,
      data,
      currentPage: page,
      totalPages,
      totalUser: total,
    };
  } catch (e) {
    console.error("adminUsersLogic error:", e);
    return { success: false, message: "Error while loading users" };
  }
};

export const adminUserEditLogic = async (status, id) => {
  try {
    if (status == null) {
      return { success: false, message: "Status is required" };
    }

    const user = await userModel.findById(id);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const isActive = status === true || status === "true";

    user.isActive = isActive;
    user.isBlocked = !isActive;
    user.status = isActive ? "active" : "blocked";

    await user.save();

    return { success: true,user };

  } catch (error) {
    console.error(error);
    return { success: false, message: "Error updating user" };
  }
};
