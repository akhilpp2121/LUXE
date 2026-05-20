import express from "express";

const router=express.Router();

import { cartPageLoad,cartAdd,removeCartProducts, quantityUpdate } from "../controller/cartController.js";
import { attachCart } from "../middleware/cartMiddleware.js"
import { isUserAuthenticated } from "../middleware/user.js";
router.get('/',isUserAuthenticated,attachCart,cartPageLoad);

router.post('/add-cart',isUserAuthenticated,cartAdd);
router.delete('/remove-cart',isUserAuthenticated, removeCartProducts); 
router.patch('/update-quantity',isUserAuthenticated,quantityUpdate) 



export default router;
