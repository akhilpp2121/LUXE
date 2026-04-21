






import {
  getUserProfileService,
  updateProfileService,
  uploadAvatarService,
  deleteAvatarService,
} from "../service/userProfileService.js";

// Profile page
export const profileLoadPage = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    const user = await getUserProfileService(req.session.user.id);
    if (!user) return res.redirect("/login");
    return res.render("Users/userProfile", { user });
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
    return res.render("Users/editProfile", { user, error: null, success: null });
  } catch (err) {
    console.error("editProfileLoad error:", err);
    return res.redirect("/login");
  }
};

// Name + Phone save
export const userProfileUpdate = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const result = await updateProfileService(req);

    if (!result.success) {
      const user = await getUserProfileService(req.session.user.id);
      return res.render("Users/editProfile", { user, error: result.message, success: null });
    }

    // Session sync
    req.session.user.fullName    = result.fullName;
    req.session.user.phoneNumber = result.phoneNumber;
    req.session.user.avatar      = result.avatar;

    return res.redirect("/profile");
  } catch (err) {
    console.error("userProfileUpdate error:", err);
    return res.status(500).send("Server error");
  }
};

// Avatar upload (AJAX)
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const result = await uploadAvatarService(
      req.session.user.id,
      req.file,
      req.session.user.avatar  // പഴയ avatar path
    );

    if (result.success) {
      req.session.user.avatar = result.avatar;  // session sync
    }

    return res.json(result);
  } catch (err) {
    console.error("uploadAvatar error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Avatar delete (AJAX)
export const deleteAvatar = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const result = await deleteAvatarService(
      req.session.user.id,
      req.session.user.avatar
    );

    if (result.success) {
      req.session.user.avatar = "";  // session sync
    }

    return res.json(result);
  } catch (err) {
    console.error("deleteAvatar error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Other pages
export const addressPageLoad = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    return res.render("Users/address", { user: req.session.user });
  } catch (err) {
    return res.redirect("/login");
  }
};

export const addAddressPageLoad = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    return res.render("Users/addAddress", { user: req.session.user });
  } catch (err) {
    return res.redirect("/login");
  }
};

export const profileEditEmailLoad = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    return res.render("Users/profileEditEmail", { user: req.session.user });
  } catch (err) {
    return res.status(500).send("Server error");
  }
};