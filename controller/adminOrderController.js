
import {
  getOrderDetailsService,
  orderManagementService,updateAllItemsStatusService,updateOrderItemStatusService,updateReturnRequestService
} from "../service/adminOrderManageService.js";

export const getOrderManagement = async (req, res) => {
  try {
    const orderData = await orderManagementService({
      page: req.query.page,
      status: req.query.status,
      search: req.query.search,
      
     
     
    });
    
    

    res.render("Admin/orderManagement", orderData);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

export const getViewOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderData = await getOrderDetailsService(orderId);

    if (!orderData.success) {
      return res.redirect("/admin/order-management"); 
    }

    return res.render("Admin/orderDetailsPage", {
      order: orderData.order,
    });
  } catch (error) {
    console.error("getViewOrder error:", error);
    return res.redirect("/admin/order-management");
  }
};

// export const updateOrderStatus = async (req, res) => {
//   try {
    
//     const result = await updateOrderStatusService(req.params.id, req.body.deliveryStatus);
//     console.log(result);
    
//     res.status(result.success ? 200 : 400).json(result);
//   } catch (error) {
//     console.error("updateOrderStatus error:", error);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };

// export const updateOrderItemStatus = async (req, res) => {
//   try {
//     const { id, variantId } = req.params;
//     const result = await updateOrderItemStatusService(id, variantId, req.body.deliveryStatus);
//     return res.status(result.success ? 200 : 400).json(result);
//   } catch (error) {
//     console.error("updateOrderItemStatus error:", error);
//     return res.status(500).json({ success: false, message: "Server Error" });
//   }
// };



// export const updateReturnRequest = async (req, res) => {
//   try {
//     const { id } = req.params;       // orderId
//     const { action, variantId ,adminRemark} = req.body; 
        
        

//     const result = await updateReturnRequestLogic(id, action, variantId,adminRemark);

//     if (!result.success) {
//       return res.status(400).json({ success: false, message: result.message });
//     }

//     return res.status(200).json({ success: true, message: result.message });

//   } catch (e) {
//     console.error("updateReturnRequest error:", e);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };




// PATCH /api/orders/:id/status
export const updateAllItemsStatus = async (req, res) => {
  try {
    const result = await updateAllItemsStatusService(req.params.id, req.body.deliveryStatus);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("updateAllItemsStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// PATCH /api/orders/:id/items/:variantId/status
export const updateOrderItemStatus = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const result = await updateOrderItemStatusService(id, variantId, req.body.deliveryStatus);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("updateOrderItemStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// PATCH /api/orders/:id/return
export const updateReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, variantId, adminRemark } = req.body;
    const result = await updateReturnRequestService(id, action, variantId, adminRemark);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("updateReturnRequest error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
