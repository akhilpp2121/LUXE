import express, { Router } from "express";

const router = express.Router();
import { userLandingLoad,userLoginLoad,userSignUpLoad ,userForgotPasswordLoad,registerController,loginController,homeLoad,otpPageLoad,verifyEmailController, resetPasswordLoad, resendOtpController,resetPassword,verifyOtpForgotPasswordController} from "../controller/userController.js";
import { profileLoadPage, verifyOtpController,updateProfile , userProfileUpdate} from "../controller/userProfileController.js";

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
router.post("/profile/update",userProfileUpdate);

router.post("/verify-otp", verifyOtpController);


export default router;
