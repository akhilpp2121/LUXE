import express, { Router } from "express";
import { avatarUpload } from "../config/multer.js";

const router = express.Router();
import { userLandingLoad,userLoginLoad,userSignUpLoad ,userForgotPasswordLoad,registerController,loginController,homeLoad,otpPageLoad,verifyOtpController,resendOtpController,verifyEmailController, resetPasswordLoad,resetPassword} from "../controller/userController.js";
import { profileLoadPage , userProfileUpdate, addressPageLoad, addAddressPageLoad,editProfileLoad,profileEditEmailLoad,deleteAvatar,uploadAvatar} from "../controller/userProfileController.js";

router.get('/',userLandingLoad)
router.get('/login',userLoginLoad)
router.get('/signUp',userSignUpLoad)
router.get('/email-verification',userForgotPasswordLoad)
router.get('/otp',otpPageLoad);
router.post('/signUp',registerController);
router.post('/login',loginController);
router.get("/homePage",homeLoad);
router.post("/email-verification",verifyEmailController)
router.post('/verify-otp',verifyOtpController)
router.post("/resend-otp",resendOtpController)
router.get("/reset-password",resetPasswordLoad)
router.post("/reset-password", resetPassword);
router.get("/profile",profileLoadPage);
router.post("/profile/update",avatarUpload.single("avatar"),userProfileUpdate);
router.get('/profile/edit',editProfileLoad)
router.get('/profile/email-edit',profileEditEmailLoad)
router.get("/address",addressPageLoad);
router.get("/address/add",addAddressPageLoad)




 
// ── AVATAR ONLY (AJAX endpoints) ────────────────────────────────
// Called by JS fetch() from the edit profile page
router.post(
  "/profile/avatar/upload",
  avatarUpload.single("avatar"),
  uploadAvatar
);
 
router.delete("/profile/avatar", deleteAvatar);

export default router;
