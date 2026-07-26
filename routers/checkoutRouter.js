import express from "express";
import { applyCouponController, checkoutPageLoad, placeOrderController, cancellPageLoad } from "../controller/checkoutController.js";
import { isUserAuthenticated } from "../middleware/user.js";
import { orderSuccessPage, orderFailedPage } from "../controller/orderController.js";
import { createOrder, captureOrder, retryCreateOrder } from "../utilites/paypal.js";

const router = express.Router();

router.get('/', isUserAuthenticated, checkoutPageLoad);
router.post('/place-order', isUserAuthenticated, placeOrderController);
router.post('/paypal/create-order', isUserAuthenticated, createOrder);
router.post('/paypal/capture-order', isUserAuthenticated, captureOrder);
router.post('/paypal/retry-order/:orderCode', isUserAuthenticated, retryCreateOrder);
router.get('/order-success/:orderCode', isUserAuthenticated, orderSuccessPage);
router.get('/order-failed/:orderCode', isUserAuthenticated, orderFailedPage);
router.get('/cancel', isUserAuthenticated, cancellPageLoad);
router.post('/apply-coupon', isUserAuthenticated, applyCouponController);

export default router;