import orderModel from "../model/orderModel.js";
import variantModel from "../model/variantModel.js";
import mongoose from "mongoose";

const LIMIT = 10;

const STATUS_MAP = {
  processing: { deliveryStatus: "pending"  },
  shipped:    { deliveryStatus: "shipped"  },
  delivered:  { deliveryStatus: "delivered" },
};

const buildFilter = (status, search) => {
  const statusFilter = STATUS_MAP[status] || {};

  if (!search) return statusFilter;

  const regex = new RegExp(search, "i");
  const searchFilter = {
    $or: [
      { orderCode: regex },
      { orderStatus: regex },
      { deliveryStatus: regex },
      { "shippingAddress.username": regex },
      { "shippingAddress.phone_number": regex },
    ],
  };

  return statusFilter.$or
    ? { $and: [statusFilter, searchFilter] }
    : { ...statusFilter, ...searchFilter };
};

export const orderManagementService = async ({ page = 1, status = "all", search = "" }) => {
  const currentPage = Number(page) || 1;
  const filter = buildFilter(status, search);

  const orders          = await orderModel.find(filter).sort({ createdAt: -1 }).skip((currentPage - 1) * LIMIT).limit(LIMIT);
  const totalOrders     = await orderModel.countDocuments();
  const filteredTotal   = await orderModel.countDocuments(filter);
  const processingCount = await orderModel.countDocuments({ deliveryStatus: "pending" });
  const deliveredCount  = await orderModel.countDocuments({ deliveryStatus: "delivered" });
  const revenueData     = await orderModel.aggregate([
    { $match: { orderStatus: { $ne: "cancelled" } } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  return {
    orders,
    totalOrders,
    filteredTotal,
    processingCount,
    deliveredCount,
    revenue: revenueData[0]?.total || 0,
    currentPage,
    limit:LIMIT,
    totalPages: Math.ceil(filteredTotal / LIMIT),
    statusFilter: status,
    search,
  };
};

export const getOrderDetailsService = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) return { success: false, message: "Invalid ID" };

  const order = await orderModel.findById(orderId);
  return order ? { success: true, order } : { success: false, message: "Order not found" };
};

const VALID_STATUSES = ["pending", "shipped", "out_for_delivery", "delivered"];

const ORDER_STATUS_MAP = {
  pending:          "placed",
  shipped:          "placed",
  out_for_delivery: "placed",
  delivered:        "completed",
};

export const updateOrderStatusService = async (orderId, deliveryStatus) => {
  if (!mongoose.Types.ObjectId.isValid(orderId))
    return { success: false, message: "Invalid order ID" };

  
  if (!VALID_STATUSES.includes(deliveryStatus))
    return { success: false, message: "Invalid status" };

  const order = await orderModel.findByIdAndUpdate(
    orderId,
    {
      deliveryStatus,
      orderStatus: ORDER_STATUS_MAP[deliveryStatus],
    },
    { returnDocument: "after" }
  );

  if (!order) return { success: false, message: "Order not found" };

  return {
    success: true,
    deliveryStatus: order.deliveryStatus,
    orderStatus: order.orderStatus,
    message: "Status updated successfully",
  };
};

export const updateReturnRequestLogic = async (orderId, action, variantId) => {
  try {
    if (!orderId || !action) {
      return { success: false, message: "Invalid request" };
    }

    const validActions = ["Approved", "Rejected"];
    if (!validActions.includes(action)) {
      return { success: false, message: "Invalid action" };
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return { success: false, message: "Invalid order ID" };
    }

    const foundOrder = await orderModel.findById(orderId);
    if (!foundOrder) {
      return { success: false, message: "Order not found" };
    }

    if (!foundOrder.returnedAt || foundOrder.returnedAt.length === 0) {
      return { success: false, message: "No return request found" };
    }

    // Find return request matching variantId and Pending status, or fallback
    let returnRequest = null;
    if (variantId) {
      returnRequest = foundOrder.returnedAt.find(
        (r) => r.variant && r.variant.toString() === variantId.toString() && r.returnRequestStatus === "Pending"
      );
    }

    if (!returnRequest) {
      // Find the latest pending return request
      returnRequest = foundOrder.returnedAt.find((r) => r.returnRequestStatus === "Pending");
    }

    if (!returnRequest) {
      // Absolute fallback to latest return request
      returnRequest = foundOrder.returnedAt[foundOrder.returnedAt.length - 1];
    }

    // Guard — already processed
    if (returnRequest.returnRequestStatus !== "Pending") {
      return { success: false, message: `Return already ${returnRequest.returnRequestStatus.toLowerCase()}` };
    }

    // Update return status
    returnRequest.returnRequestStatus = action;

    if (action === "Approved") {
      const vId = returnRequest.variant;

      if (vId) {
        const item = foundOrder.orderItems.find(
          (i) => i.variantId.toString() === vId.toString()
        );
        if (item) {
          const returnQty = Math.min(
            Number(returnRequest.quantity) || item.quantity,
            item.quantity
          );
          await variantModel.updateOne(
            { _id: vId },
            { $inc: { stock: returnQty } }
          );
        }
      }
    }
    // Rejected — no stock change needed

    await foundOrder.save();
    return { success: true, message: `Return request ${action.toLowerCase()} successfully` };

  } catch (e) {
    console.error("updateReturnRequestLogic error:", e);
    return { success: false, message: "Something went wrong" };
  }
};
