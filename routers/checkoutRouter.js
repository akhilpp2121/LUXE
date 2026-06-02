import express from "express";
import { checkoutPageLoad ,placeOrderController} from "../controller/checkoutController.js";
import { isUserAuthenticated } from "../middleware/user.js";
import { orderSuccessPage } from "../controller/orderController.js";
const router=express.Router();

router.get('/',isUserAuthenticated,checkoutPageLoad);
router.post('/place-order',isUserAuthenticated,placeOrderController);

router.get('/order-success/:orderCode', orderSuccessPage);










export default router