
// import { registerService, generateAndSendOtp, verifyOtpService } from "../service/userService.js";
// import {  updateProfileService ,getUserProfileService,editUserProfileService} from "../service/userProfileService.js";

// import { userModel } from "../model/usermodel.js";
// export const profileLoadPage = async (req, res) => {
//   try {
//     if (!req.session.user) {
//       return res.redirect("/login");
//     }

//     const user = await getUserProfileService(req.session.user.id);
//     console.log(user);
    

//     return res.render("Users/userProfile", { user });

//   } catch (err) {
//     console.log(err);
//     return res.redirect("/login");
//   }
// };


// export const updateProfile = async (req, res) => {
//   try {

//     console.log("BODY:", req.body);

//     const result = await updateProfileService(req);

//     if (result.redirect) {
//       return res.redirect(result.redirect);
//     }

//     return res.json(result);

//   } catch (error) {
//     console.log(error);
//     return res.status(500).send("Server error");
//   }
// };





// export async function userProfileUpdate(req, res) {
//   try {
//     const result = await updateProfileService(req);
//     console.log(result);
    

//     if (!result.success) {
//       return res.status(400).json(result);
//     }

//     // sync session
//     if (req.session.user) {
//       req.session.user.fullName = result.fullName;
//       req.session.user.phoneNumber = result.phoneNumber;
//       if (result.avatar) req.session.user.avatar = result.avatar;
//     }

//     return res.redirect("/profile");

//   } catch (err) {
//     console.log(err);
//     return res.status(500).send("Server error");
//   }
// }


// export const addressPageLoad = async (req, res) => {
//   try {
    
//     if (!req.session.user) {
//       return res.redirect("/login");
//     }

//     return res.render("Users/address", {
//       user: req.session.user
//     });

//   } catch (error) {
//     console.log(error);
//     return res.redirect("/login");
//   }
// };
// export async function addAddressPageLoad(req,res) {

//   try {
//     if(!req.session.user){
//       return res.redirect("/login")
//     }
//     return res.render("Users/addAddress",{user:req.session.user})
//   } catch (error) {
//     console.log(error);
//     return res.redirect("/login")
    
//   }
  
// }

// export async function editProfileLoad(req,res) {

//   try {

//     if(!req.session.user){
//       res.redirect("/login")
//     }
//   res.render("Users/editProfile",{user:req.session.user})
    
//   } catch (error) {
    
//   }
  
// }

// export async function profileEditEmailLoad(req, res) {
//   try {
//     if (!req.session.user) {
//       return res.redirect("/login");
//     }

//     return res.render("Users/profileEditEmail", {
//       user: req.session.user
//     });

//   } catch (error) {
//     console.log(error);
//     return res.status(500).send("Server error");
//   }
// }



//fresh
import {
  updateProfileService,
  getUserProfileService,
  editUserProfileService,
  

} from "../service/userProfileService.js";
import { userModel } from "../model/usermodel.js";
import { avatarUpload } from "../config/multer.js";

// ─── LOAD PAGES ───────────────────────────────────────────────────

// Profile view page
export const profileLoadPage = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    // Always fetch fresh data from DB, not session
    const user = await getUserProfileService(req.session.user.id);
    if (!user) return res.redirect("/login");

    return res.render("Users/userProfile", { user });
  } catch (err) {
    console.error("profileLoadPage error:", err);
    return res.redirect("/login");
  }
};

// Edit profile page — FIXED: fetch fresh DB data, not req.session.user
export async function editProfileLoad(req, res) {
  try {
    if (!req.session.user) return res.redirect("/login");

    // ✅ Fetch from DB so form shows latest data
    const user = await getUserProfileService(req.session.user.id);
    if (!user) return res.redirect("/login");

    return res.render("Users/editProfile", { user, error: null, success: null });
  } catch (error) {
    console.error("editProfileLoad error:", error);
    return res.redirect("/login");
  }
}





// ─── UPDATE PROFILE ───────────────────────────────────────────────
// Single clean controller — handles name, phone, and avatar together
// Route: POST /profile/update  (with avatarUpload.single('avatar') middleware)
export async function userProfileUpdate(req, res) {
  try {
    if (!req.session.user) return res.redirect("/login");

    const result = await updateProfileService(req);

    if (!result.success) {
      // Re-fetch user to re-render form with error
      const user = await getUserProfileService(req.session.user.id);
      return res.render("Users/editProfile", {
        user,
        error: result.message,
        success: null,
      });
    }

    // ✅ Sync session with updated values
    req.session.user.fullName   = result.fullName;
    req.session.user.phoneNumber = result.phoneNumber;
    req.session.user.avatar     = result.avatar;

    return res.redirect("/profile");
  } catch (err) {
    console.error("userProfileUpdate error:", err);
    return res.status(500).send("Server error");
  }
}


export async function uploadAvatar(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const userId = req.session.user.id;
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Delete old avatar from disk
    if (user.avatar && !user.avatar.includes("default-avatar")) {
      const oldPath = path.join("public", user.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const newAvatarPath = "/uploads/avatars/" + req.file.filename;
    user.avatar = newAvatarPath;
    await user.save();

    // Sync session
    req.session.user.avatar = newAvatarPath;

    return res.json({ success: true, avatar: newAvatarPath });
  } catch (err) {
    console.error("uploadAvatar error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}


export async function deleteAvatar(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const userId = req.session.user.id;
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Delete file from disk
    if (user.avatar && !user.avatar.includes("default-avatar")) {
      const filePath = path.join("public", user.avatar);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    user.avatar = "";
    await user.save();

    // Sync session
    req.session.user.avatar = "";

    return res.json({ success: true, message: "Avatar removed" });
  } catch (err) {
    console.error("deleteAvatar error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─── OTHER PAGES ──────────────────────────────────────────────────
export const addressPageLoad = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    return res.render("Users/address", { user: req.session.user });
  } catch (error) {
    console.error(error);
    return res.redirect("/login");
  }
};

export async function addAddressPageLoad(req, res) {
  try {
    if (!req.session.user) return res.redirect("/login");
    return res.render("Users/addAddress", { user: req.session.user });
  } catch (error) {
    console.error(error);
    return res.redirect("/login");
  }
}

export async function profileEditEmailLoad(req, res) {
  try {
    if (!req.session.user) return res.redirect("/login");
    return res.render("Users/profileEditEmail", { user: req.session.user });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
}