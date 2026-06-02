import express from "express";
import { orderDetailsLoad,downloadInvoice ,returnRequest,cancellRequest,userOrdersLoad} from "../controller/orderController.js";
import { isUserAuthenticated
 } from "../middleware/user.js";
const router=express.Router();





router.get('/details/:id',isUserAuthenticated,orderDetailsLoad);

router.get("/invoice/:id",isUserAuthenticated, downloadInvoice);
router.post('/cancel-order',isUserAuthenticated,cancellRequest);
router.post('/return-request',isUserAuthenticated,returnRequest)
router.get('/my-orders',isUserAuthenticated,userOrdersLoad)

export default router;