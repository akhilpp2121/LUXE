import express from "express";
import { applyCouponController, checkoutPageLoad ,placeOrderController} from "../controller/checkoutController.js";
import { isUserAuthenticated } from "../middleware/user.js";
import { orderSuccessPage } from "../controller/orderController.js";
const router=express.Router();

router.get('/',isUserAuthenticated,checkoutPageLoad);
router.post('/place-order',isUserAuthenticated,placeOrderController);

router.get('/order-success/:orderCode',isUserAuthenticated, orderSuccessPage);

router.post('/apply-coupon',isUserAuthenticated,applyCouponController)










export default router