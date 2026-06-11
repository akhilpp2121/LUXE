import express from "express";
import { adminLogin, adminLoginLoad, adminLogout, dashboardLoad, updateUserStatusController, userManagementPageLoad } from "../controller/adminController.js";
import { addCategoryPageLoad, adminCategoryAdd, adminCategoryLoad, editCategoryPageLoad, adminCategoryEdit } from "../controller/categoryController.js";
import { addProductPageLoad, adminProductPageLoad, adminProductsAdd, editProductPageLoad, adminProductsEdit, updateProductStatus } from "../controller/productsController.js";
import { isAdminAuth } from "../middleware/admin.js";
import { productUpload } from "../config/multer.js";
import { getOrderManagement, getViewOrder, updateOrderItemStatus, updateReturnRequest, updateAllItemsStatus } from "../controller/adminOrderController.js";
import { getCoupons,toggleCouponStatus,deleteCoupon ,getAddCoupon,postAddCoupon,getEditCoupon,postEditCoupon} from "../controller/adminCouponController.js";
import { offerAddPage,offerLoad,offerEditPage,offerAdd,offerEdit,offerToggle } from "../controller/adminOfferController.js";
import { adminProductOfferAdd } from "../controller/productsController.js";
import { adminCategoryOfferAdd } from "../controller/categoryController.js";
const router = express.Router();

router.get("/login", adminLoginLoad);
router.post("/login", adminLogin);

router.get("/dashboard",   isAdminAuth, dashboardLoad);
router.get("/users",       isAdminAuth, userManagementPageLoad);
router.post("/users/edit", isAdminAuth, updateUserStatusController);

router.get("/category",         isAdminAuth, adminCategoryLoad);
router.get("/addCategory",      isAdminAuth, addCategoryPageLoad);
router.get("/editCategory/:id", isAdminAuth, editCategoryPageLoad);
router.post("/category-add",    isAdminAuth, adminCategoryAdd);
router.post("/editCategory/:id",isAdminAuth, adminCategoryEdit);
router.post("/category-offer-add", isAdminAuth, adminCategoryOfferAdd);

router.get("/products",         isAdminAuth, adminProductPageLoad);
router.get("/addProduct",       isAdminAuth, addProductPageLoad);
router.get("/editProducts/:id", isAdminAuth, editProductPageLoad);

router.post("/product-add",        isAdminAuth, productUpload.any(), adminProductsAdd);
router.post("/product-edit/:id",   isAdminAuth, productUpload.any(), adminProductsEdit);
router.put("/product-status/:id",  isAdminAuth, updateProductStatus);
router.post("/product-offer-add",   isAdminAuth, adminProductOfferAdd);

router.get("/order-management",                    isAdminAuth, getOrderManagement);
router.get("/orders/:orderId",                     isAdminAuth, getViewOrder);
router.patch("/orders/:id/status",                 isAdminAuth, updateAllItemsStatus);
router.patch("/orders/:id/items/:variantId/status",isAdminAuth, updateOrderItemStatus);
router.patch("/orders/:id/return",                 isAdminAuth, updateReturnRequest);



router.get("/coupons",                isAdminAuth, getCoupons);
router.patch("/coupons/:id/toggle",   isAdminAuth, toggleCouponStatus);
router.delete("/coupons/:id",         isAdminAuth, deleteCoupon);
router.get("/coupons-add",        isAdminAuth, getAddCoupon);
router.post("/coupons-add",       isAdminAuth, postAddCoupon);
router.get("/coupon-edit/:id",    isAdminAuth, getEditCoupon);
router.post("/coupon-edit/:id",   isAdminAuth, postEditCoupon);

router.get('/offer',isAdminAuth,offerLoad)
router.get('/offer-add',isAdminAuth,offerAddPage)
router.get('/offer-edit/:id',isAdminAuth,offerEditPage)

router.post('/offer-add', isAdminAuth,  offerAdd);
router.post('/offer-edit/:id', isAdminAuth,   offerEdit);
router.patch('/offer/:id/toggle', isAdminAuth,offerToggle);   




router.post("/logout", adminLogout);


export default router;