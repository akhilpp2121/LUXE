





import express from "express";
import { avatarUpload } from "../config/multer.js";


import passport from "../config/passport.js"

import {
  userLandingLoad, userLoginLoad, userSignUpLoad, userForgotPasswordLoad,
  registerController, loginController, homeLoad, otpPageLoad,
  verifyOtpController, resendOtpController, verifyEmailController,
  resetPasswordLoad, resetPassword,googleCallback,
  logoutUserController,
  productListingLoad,
  productDetailLoad
} from "../controller/userController.js";

import {
  profileLoadPage, userProfileUpdate, addressPageLoad, editProfileLoad, profileEditEmailLoad,
  deleteAvatar, uploadAvatar,
  changePasswordLoad,
  emailChangeProfileController,
  changePasswordController,getAddressesController,addressAddController,addressEditController,addressDeleteController,addressSetDefaultController
  
} from "../controller/userProfileController.js";
import { isUserAuthenticated } from "../middleware/user.js";
const router = express.Router();
import { attachCart } from "../middleware/cartMiddleware.js";
import { moveToCart, updateWishlist, wishlistPageLoad ,removeWishlistItem} from "../controller/wishlistController.js";

router.get("/", userLandingLoad);
router.get("/login", userLoginLoad);
router.get("/signUp", userSignUpLoad);
router.post("/signUp", registerController);
router.post("/login", loginController);



router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  googleCallback
);



// ── OTP / PASSWORD ──
router.get("/email-verification", userForgotPasswordLoad);
router.post("/email-verification", verifyEmailController);
router.get("/otp", otpPageLoad);
router.post("/verify-otp", verifyOtpController);
router.post("/resend-otp", resendOtpController);
router.get("/reset-password", resetPasswordLoad);
router.post("/reset-password", resetPassword);


// ── PAGES ──
router.get("/homePage",isUserAuthenticated, attachCart,homeLoad);
router.get("/profile",isUserAuthenticated, profileLoadPage);
router.get("/profile/edit",isUserAuthenticated, editProfileLoad);
router.get("/profile/email-edit",isUserAuthenticated, profileEditEmailLoad);
router.get("/address",isUserAuthenticated, addressPageLoad);
router.get('/changePassword',isUserAuthenticated,changePasswordLoad);
router.post('/change-password',isUserAuthenticated,changePasswordController)
router.post('/profile/change-email',isUserAuthenticated,emailChangeProfileController);
router.get('/addresses',   isUserAuthenticated,           getAddressesController);
router.post('/address/add',  isUserAuthenticated,         addressAddController);
router.put('/address/edit/:id',  isUserAuthenticated,     addressEditController);
router.delete('/address/delete/:id',isUserAuthenticated,  addressDeleteController);
router.patch('/address/default/:id', isUserAuthenticated, addressSetDefaultController);


router.post("/profile/update",isUserAuthenticated, avatarUpload.none(), userProfileUpdate);


router.post("/profile/avatar/upload",isUserAuthenticated, avatarUpload.single("avatar"), uploadAvatar);
router.delete("/profile/avatar",isUserAuthenticated, deleteAvatar);
router.get('/logout',logoutUserController);

router.get("/product-listing",isUserAuthenticated,attachCart, productListingLoad);
router.get("/product-details/:productId", isUserAuthenticated, attachCart, productDetailLoad);



router.get('/wishlist',wishlistPageLoad);
router.post('/wishlist/update',updateWishlist);
router.post('/wishlist/move-to-cart',moveToCart);
router.post('/wishlist/remove', removeWishlistItem);









export default router;