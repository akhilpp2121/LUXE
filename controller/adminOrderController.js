import {
  getOrderDetailsService,
  orderManagementService,
  updateAllItemsStatusService,
  updateOrderItemStatusService,
  updateReturnRequestService,
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

// PATCH /api/orders/:id/status
export const updateAllItemsStatus = async (req, res) => {
  try {
    const result = await updateAllItemsStatusService(
      req.params.id,
      req.body.deliveryStatus,
    );
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("updateAllItemsStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateOrderItemStatus = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const result = await updateOrderItemStatusService(
      id,
      variantId,
      req.body.deliveryStatus,
    );
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("updateOrderItemStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const updateReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, variantId, adminRemark } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        message: "Action is required",
      });
    }

    const normalizedVariant =
      !variantId || variantId === "ALL" ? "ALL" : variantId;

    const remark = adminRemark?.trim() || "";

    const result = await updateReturnRequestService(
      id,
      action,
      normalizedVariant,
      remark,
    );

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("updateReturnRequest error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
