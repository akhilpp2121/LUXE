import { userModel } from "../model/usermodel.js";

export const isUserAuthenticated = async (req, res, next) => {
  let userId;
  if (req.session.user) {
    userId = req.session.user.id || req.session.user._id;
  } else if (req.isAuthenticated && req.isAuthenticated()) {
    userId = req.user._id;
  }

  if (userId) {
    try {
      const user = await userModel.findById(userId);
      if (!user || user.isBlocked) {
        req.session.user = null;
        if (req.logout) {
          req.logout(() => {});
        }
        req.session.flashMessage = {
          type: "error",
          message: "Your account has been blocked by the admin",
        };

        
        const wantsJson =
          req.method !== "GET" ||
          req.xhr ||
          (req.headers.accept && req.headers.accept.indexOf("json") > -1);

        if (wantsJson) {
          return res.status(403).json({
            success: false,
            message: "Your account has been blocked by the admin",
            redirect: "/login"
          });
        }
        return res.redirect("/login");
      }
    } catch (err) {
      console.error("isUserAuthenticated check block error:", err);
    }
  }

  if (req.session.user) {
    
    
    return next();
  }

 
  if (req.isAuthenticated && req.isAuthenticated()) {
    
    req.session.user = {
      id:          req.user._id,
      fullName:    req.user.fullName,
      email:       req.user.email,
      avatar:      req.user.avatar,
      phoneNumber: req.user.phoneNumber || "",
    };
    return next();
  }

  req.session.redirectTo = req.originalUrl;
  return res.redirect("/login");
};