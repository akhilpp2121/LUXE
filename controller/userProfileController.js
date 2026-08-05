import passport from "../config/passport.js";
import { getCartCount } from "../service/cartService.js";
import {
  getUserProfileService,
  updateProfileService,
  uploadAvatarService,
  deleteAvatarService,
} from "../service/userProfileService.js";

import {
  getAllAddressesService,
  addAddressService,
  editAddressService,
  deleteAddressService,
  setDefaultAddressService,
} from "../service/userProfileService.js";
import { generateAndSendOtp, checkAndRecordOtpRequest } from "../service/userService.js";
import { findUserBlocked } from "../service/userService.js";
import bcrypt from "bcrypt";

// Profile page

export const profileLoadPage = async (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user._id;
    const isBlockedUser = await findUserBlocked(userId);
    if (isBlockedUser) {
      req.session.user = null;
      req.session.flashMessage = {
        type: "error",
        message: "Your account has been blocked by admin.",
      };
      return req.session.save(() => res.redirect("/login"));
    }

    if (!req.session.user) return res.redirect("/login");
    const user = await getUserProfileService(req.session.user.id);
    if (!user) return res.redirect("/login");

    const flash = req.session.flashMessage || null;
    req.session.flashMessage = null;

    //  save session after clearing flash
    req.session.save(() => {
      return res.render("Users/userProfile", { user: req.session.user, flash });
    });
  } catch (err) {
    console.error("profileLoadPage error:", err);
    return res.redirect("/login");
  }
};

// Edit profile page
export const editProfileLoad = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    const user = await getUserProfileService(req.session.user.id);
    if (!user) return res.redirect("/login");

    const error = req.session.editProfileError || null;
    const success = req.session.editProfileSuccess || null;
    const fields = req.session.editProfileFields || {};

    req.session.editProfileError = null;
    req.session.editProfileSuccess = null;
    req.session.editProfileFields = null;

    if (error && fields) {
      if (fields.fullName !== undefined) user.fullName = fields.fullName;
      if (fields.phoneNumber !== undefined) user.phoneNumber = fields.phoneNumber;
    }

    return req.session.save(() => {
      res.render("Users/editProfile", {
        user,
        error,
        success,
      });
    });
  } catch (err) {
    console.error("editProfileLoad error:", err);
    return res.redirect("/login");
  }
};

export const userProfileUpdate = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const result = await updateProfileService(req);

    if (!result.success) {
      req.session.editProfileError = result.message;
      req.session.editProfileFields = {
        fullName: req.body.fullName,
        phoneNumber: req.body.phoneNumber,
      };
      return req.session.save(() => res.redirect("/profile/edit"));
    }

    req.session.user.fullName = result.fullName;
    req.session.user.phoneNumber = result.phoneNumber;
    req.session.user.avatar = result.avatar;
    req.session.editProfileSuccess = result.message;

    return req.session.save(() => res.redirect("/profile/edit"));
  } catch (err) {
    console.error("userProfileUpdate error:", err);
    req.session.editProfileError = "Server error. Please try again.";
    return req.session.save(() => res.redirect("/profile/edit"));
  }
};

// Avatar upload (AJAX)
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const result = await uploadAvatarService(
      req.session.user.id,
      req.file,
      req.session.user.avatar,
    );

    if (result.success) {
      req.session.user.avatar = result.avatar;
    }

    return res.json(result);
  } catch (err) {
    console.error("uploadAvatar error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteAvatar = async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const result = await deleteAvatarService(
      req.session.user.id,
      req.session.user.avatar,
    );

    if (result.success) {
      req.session.user.avatar = "";
    }

    return res.json(result);
  } catch (err) {
    console.error("deleteAvatar error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const addressPageLoad = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    const userId = req.session.user.id || req.session.user._id;

    const cart = await getCartCount(userId);
    return res.render("Users/address", {
      user: req.session.user,
      cart,
      data: [],
      price: 0,
    });
  } catch (err) {
    return res.redirect("/login");
  }
};

export const profileEditEmailLoad = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    const error = req.session.emailEditError || null;
    req.session.emailEditError = null;
    return req.session.save(() => {
      res.render("Users/profileEditEmail", { user: req.session.user, error });
    });
  } catch (err) {
    return res.status(500).send("Server error");
  }
};

export const emailChangeProfileController = async (req, res) => {
  try {
    const { newEmail, confirmEmail } = req.body;

    if (!newEmail || !confirmEmail) {
      req.session.emailEditError = "All fields required";
      return req.session.save(() => res.redirect("/profile/email-edit"));
    }

    if (newEmail !== confirmEmail) {
      req.session.emailEditError = "Emails do not match";
      return req.session.save(() => res.redirect("/profile/email-edit"));
    }

    const otpLimit = await checkAndRecordOtpRequest(newEmail);
    if (!otpLimit.allowed) {
      req.session.emailEditError = otpLimit.message;
      return req.session.save(() => res.redirect("/profile/email-edit"));
    }

    req.session.tempEmail = newEmail;
    req.session.otpContext = "CHANGE_EMAIL";

    await generateAndSendOtp(req, newEmail);

    return res.redirect("/otp");
  } catch (error) {
    console.error(error);
    req.session.emailEditError = "Server error. Please try again.";
    return req.session.save(() => res.redirect("/profile/email-edit"));
  }
};

export const changePasswordLoad = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    return res.render("Users/changePassword");
  } catch (error) {
    return res.status(500).send("server error");
  }
};

export const changePasswordController = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const userId = req.session.user?.id;

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await getUserProfileService(userId);

    if (!user) {
      return res.redirect("/profile");
    }

    //  check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      req.session.flashMessage = {
        type: "error",
        text: "Current password is incorrect!",
      };
      req.session.save(() => res.redirect("/profile"));
      return;
    }

    // check new password match
    if (newPassword !== confirmPassword) {
      return res.redirect("/profile");
    }

    //  hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();
    req.session.flashMessage = {
      type: "success",
      text: "Password changed successfully!",
    };

    req.session.save(() => {
      return res.redirect("/profile");
    });
  } catch (error) {
    console.error(error);
    return res.redirect("/profile");
  }
};

const handleError = (res, error) => {
  console.error("[Address Controller]", error.message);
  const status = error.statusCode || 500;
  const message = error.statusCode ? error.message : "Internal server error.";
  return res.status(status).json({ message });
};

export const getAddressesController = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const addresses = await getAllAddressesService(userId);

    return res.status(200).json({ addresses });
  } catch (error) {
    return handleError(res, error);
  }
};

export const addressAddController = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const newAddress = await addAddressService(userId, req.body);
    return res
      .status(201)
      .json({
        success: true,
        message: "Address added successfully.",
        address: newAddress,
      });
  } catch (error) {
    return handleError(res, error);
  }
};

export const addressEditController = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const { id } = req.params;
    const updated = await editAddressService(userId, id, req.body);
    return res
      .status(200)
      .json({ message: "Address updated successfully.", address: updated });
  } catch (error) {
    return handleError(res, error);
  }
};

export const addressDeleteController = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const { id } = req.params;
    const result = await deleteAddressService(userId, id);
    return res
      .status(200)
      .json({
        message: "Address removed successfully.",
        deletedId: result.deletedId,
      });
  } catch (error) {
    return handleError(res, error);
  }
};

export const addressSetDefaultController = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });

    const { id } = req.params;
    const updated = await setDefaultAddressService(userId, id);

    return res.status(200).json({
      success: true,
      message: "Default address updated.",
      address: updated,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
