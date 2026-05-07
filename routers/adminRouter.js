

import express from "express";
import { adminLogin, adminLoginLoad, adminLogout, dashboardLoad, updateUserStatusController, userManagementPageLoad } from "../controller/adminController.js";
import { addCategoryPageLoad, adminCategoryAdd, adminCategoryLoad, editCategoryPageLoad ,adminCategoryDelete,adminCategoryEdit} from "../controller/categoryController.js";
import { isAdminAuth } from "../middleware/admin.js";

const router = express.Router();

router.get("/login",  adminLoginLoad);
router.post("/login", adminLogin);

router.get("/dashboard",    isAdminAuth, dashboardLoad);
router.get("/users",        isAdminAuth, userManagementPageLoad);
router.post("/users/edit",  isAdminAuth, updateUserStatusController);
router.post("/logout",      adminLogout);

router.get("/category",         adminCategoryLoad);
router.get("/addCategory",      addCategoryPageLoad);
router.get("/editCategory/:id", editCategoryPageLoad);   
router.post("/category-add", adminCategoryAdd);
router.delete('/category/:id', adminCategoryDelete);
router.post("/editCategory/:id", isAdminAuth, adminCategoryEdit);

export default router;