export const isUserAuthenticated = (req, res, next) => {
 
  

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

  return res.redirect("/login");
};