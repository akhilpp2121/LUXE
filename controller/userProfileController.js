

import { userModel } from "../model/usermodel.js";

export const profileLoadPage = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    return res.render("Users/userProfile", {
      user: req.session.user
    });

  } catch (err) {
    console.log(err);
    return res.redirect("/login");
  }
};


export const updateProfile = async (req, res) => {
  try {

    console.log("BODY:", req.body);

    const result = await updateProfileService(req);

    if (result.redirect) {
      return res.redirect(result.redirect);
    }

    return res.json(result);

  } catch (error) {
    console.log(error);
    return res.status(500).send("Server error");
  }
};

export const verifyOtpController = async (req, res) => {
  try {
    const { otp } = req.body;

    const sessionOtp = req.session.otp;
    const sessionExpiry = req.session.otpExpires;

    // ❌ OTP missing
    if (!sessionOtp) {
      return res.json({ success: false, message: "OTP expired" });
    }

    // ❌ OTP expired
    if (Date.now() > sessionExpiry) {
      return res.json({ success: false, message: "OTP expired" });
    }

    // ❌ wrong OTP
    if (Number(otp) !== sessionOtp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    
    // EMAIL UPDATE FLOW
    
    if (req.session.otpContext === "EMAIL_EDIT") {
      const userId = req.session.user?.id;
      const newEmail = req.session.tempEmail;

      if (!userId || !newEmail) {
        return res.json({ success: false, message: "Session error" });
      }

      const user = await userModel.findById(userId);

      if (!user) {
        return res.json({ success: false, message: "User not found" });
      }

      const existing = await userModel.findOne({
        email: newEmail.toLowerCase()
      });

      if (existing && existing._id.toString() !== userId) {
        return res.json({ success: false, message: "Email already in use" });
      }

      user.email = newEmail.toLowerCase();
      await user.save();

      req.session.user.email = user.email;

      // cleanup
      req.session.tempEmail = null;
      req.session.otpContext = null;
      req.session.otp = null;
      req.session.otpExpires = null;

      return res.json({
        success: true,
        redirect: "/profile",
        message: "Email updated successfully"
      });
    }

    
    // RESET PASSWORD FLOW
   
    if (req.session.otpContext === "RESET_PASSWORD") {
      req.session.otp = null;
      req.session.otpExpires = null;
      req.session.otpContext = null;

      return res.json({
        success: true,
        redirect: "/reset-password"
      });
    }

    // ❌ fallback
    return res.json({
      success: false,
      message: "Invalid flow"
    });

  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "Server error"
    });
  }
};


import { editUserProfileService } from "../service/userProfileService.js";

export async function userProfileUpdate(req, res) {
  try {
    const userId = req.session.user?.id;
    const { type, value } = req.body;

    const result = await editUserProfileService(userId, type, value, req);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // update session if name/email changed
    if (result.fullName) {
      req.session.user.fullName = result.fullName;
    }

    if (result.email) {
      req.session.user.email = result.email;
    }

    return res.redirect(result.redirect || "/profile");

  } catch (err) {
    console.log(err);
    return res.status(500).send("Server error");
  }
}


