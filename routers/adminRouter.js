

import express from "express";
import { adminLogin, adminLoginLoad, adminLogout, dashboardLoad, updateUserStatusController, userManagementPageLoad } from "../controller/adminController.js";
import { addCategoryPageLoad, adminCategoryAdd, adminCategoryLoad, editCategoryPageLoad ,adminCategoryEdit} from "../controller/categoryController.js";
import { addProductPageLoad, adminProductPageLoad, adminProductsAdd, editProductPageLoad ,adminProductsEdit,updateProductStatus} from "../controller/productsController.js";
import { isAdminAuth } from "../middleware/admin.js";
import { productUpload } from "../config/multer.js";
import { getOrderManagement ,getViewOrder,updateOrderItemStatus,updateReturnRequest, updateAllItemsStatus} from "../controller/adminOrderController.js";

const router = express.Router();

router.get("/login",  adminLoginLoad);
router.post("/login", adminLogin);

router.get("/dashboard",    isAdminAuth, dashboardLoad);
router.get("/users",        isAdminAuth, userManagementPageLoad);
router.post("/users/edit",  isAdminAuth, updateUserStatusController);


router.get("/category",   isAdminAuth,      adminCategoryLoad);
router.get("/addCategory",  isAdminAuth,    addCategoryPageLoad);
router.get("/editCategory/:id", isAdminAuth,editCategoryPageLoad);   
router.post("/category-add",isAdminAuth, adminCategoryAdd);
router.post("/editCategory/:id", isAdminAuth, adminCategoryEdit);




router.get('/products',isAdminAuth,adminProductPageLoad)
router.get('/addProduct',isAdminAuth,addProductPageLoad);
router.get('/editProducts/:id',isAdminAuth,editProductPageLoad);


router.post('/product-add',isAdminAuth,productUpload.any(),adminProductsAdd);
router.post('/product-edit/:id',isAdminAuth,productUpload.any(),adminProductsEdit)
router.put( "/product-status/:id",isAdminAuth ,updateProductStatus);

router.get('/order-management',isAdminAuth,getOrderManagement)
router.get("/orders/:orderId",isAdminAuth, getViewOrder);
router.patch("/orders/:id/status",isAdminAuth, updateAllItemsStatus);
router.patch("/orders/:id/items/:variantId/status",isAdminAuth, updateOrderItemStatus);
router.patch("/orders/:id/return",isAdminAuth, updateReturnRequest);







router.post("/logout",      adminLogout);
 

export default router;
