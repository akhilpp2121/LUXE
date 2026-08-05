





import express, { Router } from "express";
import { avatarUpload } from "../config/multer.js";


import passport from "../config/passport.js"

import {
  userLandingLoad, userLoginLoad, userSignUpLoad, userForgotPasswordLoad,
  registerController, loginController, homeLoad, otpPageLoad,
  verifyOtpController, resendOtpController, verifyEmailController,
  resetPasswordLoad, resetPassword,googleCallback,
  logoutUserController,
  productListingLoad,
  productDetailLoad,getProductVariants
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
import { cartAdd } from "../controller/cartController.js";
import { walletPageLoad } from "../controller/walletController.js";
import { referalPageLoad,referalLinkGenerator } from "../controller/userReferalController.js";






router.get("/", userLandingLoad);
router.get("/login", userLoginLoad);
router.get("/signUp", userSignUpLoad);
router.get("/signup", userSignUpLoad);
router.post("/signUp", registerController);
router.post("/signup", registerController);
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

router.get("/product-listing", attachCart, productListingLoad);
router.get("/product-details/:productId", attachCart, productDetailLoad);

router.get("/product/:productId/variants",isUserAuthenticated, getProductVariants);


router.get('/wishlist',isUserAuthenticated,wishlistPageLoad);
router.post('/wishlist/update',isUserAuthenticated,updateWishlist);
router.post('/wishlist/remove',isUserAuthenticated, removeWishlistItem);




router.get('/wallet',isUserAuthenticated,walletPageLoad);
router.get('/referal',isUserAuthenticated,referalPageLoad);
router.post('/profile/referal-link',isUserAuthenticated,referalLinkGenerator);





export default router;