import express, { Router } from "express";

const router = express.Router();
import { userLandingLoad,userLoginLoad,userSignUpLoad ,userForgotPasswordLoad,registerController,loginController,homeLoad,otpPageLoad,verifyEmailController,verifyOtpController, resetPasswordLoad, resendOtpController,resetPassword} from "../controller/userController.js";


router.get('/',userLandingLoad)
router.get('/login',userLoginLoad)
router.get('/signUp',userSignUpLoad)
router.get('/email-verification',userForgotPasswordLoad)
router.get('/otp',otpPageLoad);
router.post('/signUp',registerController);
router.post('/login',loginController);
router.get("/homePage",homeLoad);
router.post("/email-verification",verifyEmailController)
router.post("/verify-otp",verifyOtpController)
router.post("/resend-otp",resendOtpController)
router.get("/reset-password",resetPasswordLoad)
router.post("/reset-password", resetPassword);


export default router;
