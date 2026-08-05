import { returnRequest } from "../controller/orderController.js";
import orderModel from "../model/orderModel.js";
import { userModel } from "../model/usermodel.js";
import variantModel from "../model/variantModel.js";
import { creditWallet } from "../service/walletService.js";
import mongoose from "mongoose";

const LIMIT = 10;
const buildFilter = (status, search) => {
  const conditions = [];

  // Status filter
  if (status === "processing") conditions.push({ deliveryStatus: "pending" });
  if (status === "shipped") conditions.push({ deliveryStatus: "shipped" });
  if (status === "delivered") conditions.push({ deliveryStatus: "delivered" });
  if (status === "cancelled") {
    conditions.push({
      $or: [{ deliveryStatus: "cancelled" }, { orderStatus: "cancelled" }],
    });
  }

  // Search filter
  if (search) {
    const regex = new RegExp(search, "i");
    conditions.push({
      $or: [
        { orderCode: regex },
        { orderStatus: regex },
        { deliveryStatus: regex },
        { "shippingAddress.username": regex },
        { "shippingAddress.phone_number": regex },
      ],
    });
  }

  return conditions.length ? { $and: conditions } : {};
};
export const orderManagementService = async ({
  page = 1,
  status = "all",
  search = "",
}) => {
  const currentPage = Number(page) || 1;
  const filter = buildFilter(status, search);

  const orders = await orderModel
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * LIMIT)
    .limit(LIMIT);

  const totalOrders = await orderModel.countDocuments();
  const filteredTotal = await orderModel.countDocuments(filter);

  const processingCount = await orderModel.countDocuments({
    deliveryStatus: "pending",
  });

  const deliveredCount = await orderModel.countDocuments({
    deliveryStatus: "delivered",
  });

  const revenueData = await orderModel.aggregate([
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
    limit: LIMIT,
    totalPages: Math.ceil(filteredTotal / LIMIT),
    statusFilter: status,
    search,
  };
};

export const getOrderDetailsService = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId))
    return { success: false, message: "Invalid ID" };

  const order = await orderModel.findById(orderId);
  return order
    ? { success: true, order }
    : { success: false, message: "Order not found" };
};

const STATUS_RANK = {
  pending: 0,
  shipped: 1,
  out_for_delivery: 2,
  delivered: 3,
  
};

const VALID_ADMIN_STATUSES = [
  "pending",
  "shipped",
  "out_for_delivery",
  "delivered",
  
];

const deriveOrderStatus = (orderItems) => {
  const statuses = orderItems.map((item) => item.deliveryStatus || "pending");

  const activeStatuses = statuses.filter(
    (s) => s !== "cancelled" && s !== "returned",
  );

  if (activeStatuses.length === 0) {
    return statuses.includes("returned")
      ? { deliveryStatus: "returned", orderStatus: "returned" }
      : { deliveryStatus: "cancelled", orderStatus: "cancelled" };
  }

  if (activeStatuses.every((s) => s === "delivered")) {
    return { deliveryStatus: "delivered", orderStatus: "completed" };
  }

  if (activeStatuses.includes("delivered")) {
    return { deliveryStatus: "partially_delivered", orderStatus: "placed" };
  }

  if (activeStatuses.includes("out_for_delivery")) {
    return { deliveryStatus: "out_for_delivery", orderStatus: "placed" };
  }
  if (activeStatuses.includes("shipped")) {
    return { deliveryStatus: "shipped", orderStatus: "placed" };
  }
  if(activeStatuses.includes("cancelled")){
    return {deliveryStatus:"cancelled",orderStatus:"cancelled"}
  }

  return { deliveryStatus: "pending", orderStatus: "placed" };
};



export const updateAllItemsStatusService = async (orderId, deliveryStatus) => {
  if (!mongoose.Types.ObjectId.isValid(orderId))
    return { success: false, message: "Invalid order ID" };

  if (!VALID_ADMIN_STATUSES.includes(deliveryStatus))
    return { success: false, message: "Invalid status" };

  const order = await orderModel.findById(orderId);
  if (!order) return { success: false, message: "Order not found" };

  const newRank = STATUS_RANK[deliveryStatus];

  if (newRank === undefined) {
    return { success: false, message: "Invalid status value" };
  }

  //  FULLY CANCELLED BLOCK
  const isFullyCancelled = order.orderItems.every(
    (item) => item.deliveryStatus === "cancelled"
  );

  if (isFullyCancelled) {
    return {
      success: false,
      message: "Cannot update cancelled order",
    };
  }

  for (let item of order.orderItems) {
    if (
      item.deliveryStatus === "cancelled" ||
      item.deliveryStatus === "returned"
    ) {
      continue;
    }

    const currentRank = STATUS_RANK[item.deliveryStatus];

    if (newRank <= currentRank) {
      return {
        success: false,
        message: `Invalid status change: ${item.deliveryStatus} → ${deliveryStatus}`,
      };
    }

    item.deliveryStatus = deliveryStatus;
  }

  // Only update order if not fully cancelled
  const allCancelled = order.orderItems.every(
    (item) => item.deliveryStatus === "cancelled"
  );

  if (!allCancelled) {
    const derived = deriveOrderStatus(order.orderItems);
    order.deliveryStatus = derived.deliveryStatus;
    order.orderStatus = derived.orderStatus;
  }

  await order.save();

  return {
    success: true,
    deliveryStatus: order.deliveryStatus,
    orderStatus: order.orderStatus,
    message: "All items updated successfully",
  };
};




export const updateOrderItemStatusService = async (
  orderId,
  variantId,
  deliveryStatus,
) => {
  if (!mongoose.Types.ObjectId.isValid(orderId))
    return { success: false, message: "Invalid order ID" };

  if (!mongoose.Types.ObjectId.isValid(variantId))
    return { success: false, message: "Invalid variant ID" };

  if (!VALID_ADMIN_STATUSES.includes(deliveryStatus))
    return { success: false, message: "Invalid status" };

  const order = await orderModel.findById(orderId);
  if (!order) return { success: false, message: "Order not found" };

  const item = order.orderItems.find(
    (i) => i.variantId.toString() === variantId.toString(),
  );
  if (!item) return { success: false, message: "Item not found in order" };

  if (item.deliveryStatus === "cancelled")
    return { success: false, message: "Cannot update a cancelled item" };

  if (item.deliveryStatus === "returned")
    return { success: false, message: "Cannot update a returned item" };

  item.deliveryStatus = deliveryStatus;

  const derived = deriveOrderStatus(order.orderItems);
  order.deliveryStatus = derived.deliveryStatus;
  order.orderStatus = derived.orderStatus;

  await order.save();

  return {
    success: true,
    itemStatus: item.deliveryStatus,
    deliveryStatus: order.deliveryStatus,
    orderStatus: order.orderStatus,
    message: "Item status updated successfully",
  };
};

const GST_RATE = 0.05;
const SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 99;

function calcOrderTotal(
  orderItems,
  couponApplied,
  cancelledVariantIds,
  approvedQtyByVariant,
) {
  let activeSubTotal = 0;

  for (const item of orderItems) {
    const vid = item.variantId.toString();
    if (cancelledVariantIds.has(vid)) continue;

    const unitValue = item.quantity > 0 ? item.totalPrice / item.quantity : 0;

    const approvedQty = Math.min(approvedQtyByVariant[vid] ?? 0, item.quantity);

    const remainingQty = Math.max(item.quantity - approvedQty, 0);

    activeSubTotal += unitValue * remainingQty;
  }

  const hasActiveItems = activeSubTotal > 0;

  const coupon = hasActiveItems
    ? Math.min(couponApplied || 0, activeSubTotal)
    : 0;

  const taxable = Math.max(activeSubTotal - coupon, 0);
  const gst = Math.round(taxable * GST_RATE);

  const shipping = hasActiveItems
    ? activeSubTotal >= SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_FEE
    : 0;

  return Math.round(taxable + gst + shipping);
}

export const updateReturnRequestService = async (
  orderId,
  action,
  variantId,
  adminRemark,
) => {
  try {
    if (!orderId || !action)
      return { success: false, message: "orderId & action required" };

    if (!["Approved", "Rejected"].includes(action))
      return { success: false, message: "Invalid action" };

    const order = await orderModel.findById(orderId);
    if (!order) return { success: false, message: "Order not found" };

    const isPaid = ["paypal", "wallet", "cod"].includes(order.orderMethod);

    if (!Array.isArray(order.returnedAt)) {
      order.returnedAt = [];
    }

    const isAll = !variantId || variantId === "ALL";

    const pendingReturns = order.returnedAt.filter(
      (r) =>
        r.returnRequestStatus.toLowerCase() === "pending" &&
        (isAll || r.variant.toString() === variantId.toString()),
    );

    if (!pendingReturns.length)
      return { success: true, message: "No pending return found" };

    // Snapshot of cancelled variants
    const cancelledVariantIds = new Set();
    (order.cancelledAt || []).forEach((c) => {
      (c.cancelledProducts || []).forEach((pid) => {
        cancelledVariantIds.add(pid._id ? pid._id.toString() : String(pid));
      });
    });

    // Already approved quantities
    const approvedQtyByVariant = {};
    (order.returnedAt || []).forEach((r) => {
      if (r.variant && r.returnRequestStatus === "Approved") {
        const vid = r.variant.toString();
        approvedQtyByVariant[vid] =
          (approvedQtyByVariant[vid] || 0) + (r.quantity || 1);
      }
    });

    let totalRefund = 0;
    const refundBreakdown = [];

    for (const r of pendingReturns) {
      r.returnRequestStatus = action;
      r.adminRemark = adminRemark || "";

      if (action === "Approved") {
        const item = order.orderItems.find(
          (i) => i.variantId.toString() === r.variant.toString(),
        );
        if (!item || item.quantity <= 0) continue;

        const qty = r.quantity || item.quantity;
        const vid = r.variant.toString();

        await variantModel.updateOne(
          { _id: r.variant },
          { $inc: { stock: qty } },
        );

        item.deliveryStatus = "returned";

        // Total BEFORE
        const totalBefore = calcOrderTotal(
          order.orderItems,
          order.couponApplied,
          cancelledVariantIds,
          approvedQtyByVariant,
        );

        // Apply return
        approvedQtyByVariant[vid] = (approvedQtyByVariant[vid] || 0) + qty;

        // Total AFTER
        const totalAfter = calcOrderTotal(
          order.orderItems,
          order.couponApplied,
          cancelledVariantIds,
          approvedQtyByVariant,
        );

        // Refund = difference
        const itemRefund = Math.max(totalBefore - totalAfter, 0);

        totalRefund += itemRefund;

        refundBreakdown.push({
          variant: vid,
          productName: item.productName,
          quantity: qty,
          refund: itemRefund,
        });
      }
    }

    totalRefund = Math.round(totalRefund);

    if (action === "Approved") {
      const derived = deriveOrderStatus(order.orderItems);
      order.deliveryStatus = derived.deliveryStatus;
      order.orderStatus = derived.orderStatus;
    }

    await order.save();

    if (action === "Approved" && isPaid && totalRefund > 0) {
      await creditWallet(
        order.userId,
        totalRefund,
        `Refund for return in order #${order.orderCode}`,
        orderId,
      );
    }

    return {
      success: true,
      message:
        action === "Approved"
          ? `Return approved. ₹${totalRefund} refunded to wallet${
              refundBreakdown.length > 1
                ? ` (${refundBreakdown.length} items)`
                : ""
            }.`
          : "Return request rejected",
      refundBreakdown: action === "Approved" ? refundBreakdown : undefined,
      totalRefund: action === "Approved" ? totalRefund : undefined,
    };
  } catch (error) {
    console.error("updateReturnRequestService error:", error);
    return { success: false, message: "Server error" };
  }
};
