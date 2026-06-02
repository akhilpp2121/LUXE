
import {
  getOrderDetailsService,
  orderManagementService,updateOrderStatusService,updateReturnRequestLogic
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
      return res.status(orderData.statusCode).redirect("/admin/order-management");
    }

    return res.render("Admin/orderDetailsPage", {
      order: orderData.order,
    });
  } catch (error) {
    console.error("getViewOrder error:", error);
    return res.status(500).redirect("/admin/order-management");
  }
};


export const updateOrderStatus = async (req, res) => {
  try {
    console.log("orderId:", req.params.id);
    console.log("deliveryStatus:", req.body.deliveryStatus);

    const result = await updateOrderStatusService(req.params.id, req.body.deliveryStatus);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};



export const updateReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;       // orderId
    const { action, variantId } = req.body;     // "Approved" or  "Rejected", and variantId of return request

    const result = await updateReturnRequestLogic(id, action, variantId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({ success: true, message: result.message });

  } catch (e) {
    console.error("updateReturnRequest error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

