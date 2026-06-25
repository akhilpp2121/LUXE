import express from "express";
import { applyCouponController, checkoutPageLoad, placeOrderController, cancellPageLoad } from "../controller/checkoutController.js";
import { isUserAuthenticated } from "../middleware/user.js";
import { orderSuccessPage } from "../controller/orderController.js";
import { createOrder, captureOrder } from "../utilites/paypal.js";

const router = express.Router();

router.get('/', isUserAuthenticated, checkoutPageLoad);
router.post('/place-order', isUserAuthenticated, placeOrderController);
router.post('/paypal/create-order', isUserAuthenticated, createOrder);   
router.post('/paypal/capture-order', isUserAuthenticated, captureOrder); 
router.get('/order-success/:orderCode', isUserAuthenticated, orderSuccessPage);
router.get('/cancel',isUserAuthenticated,cancellPageLoad)
router.post('/apply-coupon', isUserAuthenticated, applyCouponController);

export default router;