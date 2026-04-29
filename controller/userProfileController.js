





import passport from "../config/passport.js";
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
} from '../service/userProfileService.js'; 
import { generateAndSendOtp } from "../service/userService.js";
import bcrypt from "bcrypt";


// Profile page


export const profileLoadPage = async (req, res) => {
  try {
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
    return res.render("Users/editProfile", { user, error: null, success: null });
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
      const user = await getUserProfileService(req.session.user.id);
      return res.render("Users/editProfile", {
        user,
        error: result.message,
        success: null
      });
    }

    req.session.user.fullName    = result.fullName;
    req.session.user.phoneNumber = result.phoneNumber;
    req.session.user.avatar      = result.avatar;

    // STAY ON SAME PAGE WITH SUCCESS
    const updatedUser = await getUserProfileService(req.session.user.id);

    return res.render("Users/editProfile", {
      user: updatedUser,
      error: null,
      success: result.message
    });

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
      return res.redirect("/profile"); 
    }

    // check new password match
    if (newPassword !== confirmPassword) {
      return res.redirect("/profile");
    }

    //  hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    
user.password = hashedPassword;
await user.save();
req.session.flashMessage = { type: "success", text: "Password changed successfully!" };

//  save session before redirect
req.session.save(() => {
  return res.redirect("/profile");
});

  } catch (error) {
    console.error(error);
    return res.redirect("/profile");
  }
};






const handleError = (res, error) => {
  console.error('[Address Controller]', error.message);
  const status = error.statusCode || 500;
  const message = error.statusCode ? error.message : 'Internal server error.';
  return res.status(status).json({ message });
};

export const getAddressesController = async (req, res) => {
  try {
    const userId = req.session.user?.id;  
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const addresses = await getAllAddressesService(userId);
    return res.status(200).json({ addresses });
  } catch (error) {
    return handleError(res, error);
  }
};

export const addressAddController = async (req, res) => {
  try {
    const userId = req.session.user?.id;  
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const newAddress = await addAddressService(userId, req.body);
    return res.status(201).json({ message: 'Address added successfully.', address: newAddress });
  } catch (error) {
    return handleError(res, error);
  }
};

export const addressEditController = async (req, res) => {
  try {
    const userId = req.session.user?.id;  
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const { id } = req.params;
    const updated = await editAddressService(userId, id, req.body);
    return res.status(200).json({ message: 'Address updated successfully.', address: updated });
  } catch (error) {
    return handleError(res, error);
  }
};

export const addressDeleteController = async (req, res) => {
  try {
    const userId = req.session.user?.id;  
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const { id } = req.params;
    const result = await deleteAddressService(userId, id);
    return res.status(200).json({ message: 'Address removed successfully.', deletedId: result.deletedId });
  } catch (error) {
    return handleError(res, error);
  }
};

export const addressSetDefaultController = async (req, res) => {
  try {
    const userId = req.session.user?.id;  
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const { id } = req.params;
    const updated = await setDefaultAddressService(userId, id);
    return res.status(200).json({ message: 'Default address updated.', address: updated });
  } catch (error) {
    return handleError(res, error);
  }
};

