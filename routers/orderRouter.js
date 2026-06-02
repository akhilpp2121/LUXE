import express from "express";
import { orderDetailsLoad,downloadInvoice ,returnRequest,cancellRequest,userOrdersLoad} from "../controller/orderController.js";
const router=express.Router();





router.get('/details/:id',orderDetailsLoad);

router.get("/invoice/:id", downloadInvoice);
router.post('/cancel-order',cancellRequest);
router.post('/return-request',returnRequest)
router.get('/my-orders',userOrdersLoad)

export default router;