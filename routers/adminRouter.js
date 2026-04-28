import express from "express";
import { adminLogin, adminLoginLoad, adminLogout, dashboardLoad,updateUserStatusController,userManagementPageLoad } from "../controller/adminController.js";
import { isAdminAuth } from "../middleware/admin.js"

const router = express.Router();

router.get('/login', adminLoginLoad);
router.post('/login', adminLogin);

router.get('/dashboard', isAdminAuth, dashboardLoad);
router.get('/users',isAdminAuth,userManagementPageLoad)
router.post('/users/edit',isAdminAuth,updateUserStatusController);
router.post('/logout',adminLogout)

export default router;
