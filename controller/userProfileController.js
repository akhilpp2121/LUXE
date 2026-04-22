





import passport from "../config/passport.js";
import {
  getUserProfileService,
  updateProfileService,
  uploadAvatarService,
  deleteAvatarService,
} from "../service/userProfileService.js";
import { generateAndSendOtp } from "../service/userService.js";
import bcrypt from "bcrypt";


// Profile page
export const profileLoadPage = async (req, res) => {
  try {

    if (!req.session.user) return res.redirect("/login");
    const user = await getUserProfileService(req.session.user.id);
    if (!user) return res.redirect("/login");
    const message = req.session.message;

    
    req.session.message = null;

    return res.render("Users/userProfile", { user ,message});
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
      req.session.user.avatar  
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
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const result = await deleteAvatarService(
      req.session.user.id,
      req.session.user.avatar
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

export const emailChangeProfileController = async (req, res) => {
  try {
    const { newEmail, confirmEmail } = req.body;

    if (!newEmail || !confirmEmail) {
      return res.send('All fields required');
    }

    if (newEmail !== confirmEmail) {
      return res.send('Emails do not match');
    }

    req.session.tempEmail = newEmail; 
    req.session.otpContext = "CHANGE_EMAIL";


    await generateAndSendOtp(req, newEmail);

    return res.redirect('/otp');

  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

export const changePasswordLoad= async(req,res)=>{

  try {
    if(!req.session.user){
      return res.redirect("/login")
    }
    return res.render("Users/changePassword");
    
  } catch (error) {
    return res.status(500).send("server error")
    
  }

}

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
      return res.redirect("/profile"); // wrong current password
    }

    // check new password match
    if (newPassword !== confirmPassword) {
      return res.redirect("/profile");
    }

    //  hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    
user.password = hashedPassword;
await user.save();
req.session.message = "Password changed successfully";

    return res.redirect("/profile");

  } catch (error) {
    console.error(error);
    return res.redirect("/profile");
  }
};
