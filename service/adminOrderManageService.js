import { returnRequest } from "../controller/orderController.js";
import orderModel from "../model/orderModel.js";
import { userModel } from "../model/usermodel.js";
import variantModel from "../model/variantModel.js";
import mongoose from "mongoose";


const LIMIT=10;
const buildFilter = (status, search) => {
  const filter = {};

  // Status filter
  if (status === "processing") filter.deliveryStatus = "pending";
  if (status === "shipped") filter.deliveryStatus = "shipped";
  if (status === "delivered") filter.deliveryStatus = "delivered";

 

  //  Search filter
  if (search) {
    const regex = new RegExp(search, "i");

    filter.$or = [
      { orderCode: regex },
      { orderStatus: regex },
      { deliveryStatus: regex },
      { "shippingAddress.username": regex },
      { "shippingAddress.phone_number": regex },
    ];
  }

  return filter;
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
  if (!mongoose.Types.ObjectId.isValid(orderId)) return { success: false, message: "Invalid ID" };

  const order = await orderModel.findById(orderId);
  return order ? { success: true, order } : { success: false, message: "Order not found" };
};

// const VALID_STATUSES = ["pending", "shipped", "out_for_delivery", "delivered"];
// const VALID_ITEM_STATUSES = ["pending", "shipped", "out_for_delivery", "delivered"];

// const ORDER_STATUS_MAP = {
//   pending:          "placed",
//   shipped:          "placed",
//   out_for_delivery: "placed",
//   delivered:        "completed",
 
// };

// export const updateOrderStatusService = async (orderId, deliveryStatus) => {
//   if (!mongoose.Types.ObjectId.isValid(orderId))
//     return { success: false, message: "Invalid order ID" };

  
//   if (!VALID_STATUSES.includes(deliveryStatus))
//     return { success: false, message: "Invalid status" };

//   const order = await orderModel.findById(orderId);

//   if (!order) return { success: false, message: "Order not found" };

//   order.deliveryStatus = deliveryStatus;
//   order.orderStatus = ORDER_STATUS_MAP[deliveryStatus];
//   order.orderItems.forEach((item) => {
//     if (item.deliveryStatus !== "returned") {
//       item.deliveryStatus = deliveryStatus;
//     }
//   });

//   await order.save();

//   return {
//     success: true,
//     deliveryStatus: order.deliveryStatus,
//     orderStatus: order.orderStatus,
//     message: "Status updated successfully",
//   };
// };

// export const updateOrderItemStatusService = async (orderId, variantId, deliveryStatus) => {
//   if (!mongoose.Types.ObjectId.isValid(orderId)) {
//     return { success: false, message: "Invalid order ID" };
//   }

//   if (!mongoose.Types.ObjectId.isValid(variantId)) {
//     return { success: false, message: "Invalid product ID" };
//   }

//   if (!VALID_ITEM_STATUSES.includes(deliveryStatus)) {
//     return { success: false, message: "Invalid status" };
//   }

//   const order = await orderModel.findById(orderId);
//   if (!order) return { success: false, message: "Order not found" };

//   const item = order.orderItems.find((orderItem) => (
//     orderItem.variantId.toString() === variantId.toString()
//   ));

//   if (!item) return { success: false, message: "Product not found in order" };

//   item.deliveryStatus = deliveryStatus;

//   const itemStatuses = order.orderItems.map((orderItem) => (
//     orderItem.deliveryStatus || order.deliveryStatus || "pending"
//   ));
//   const activeStatuses = itemStatuses.filter((status) => status !== "cancelled" && status !== "returned");

//   if (activeStatuses.length === 0) {
//     order.deliveryStatus = itemStatuses.includes("returned") ? "delivered" : "cancelled";
//     order.orderStatus = itemStatuses.includes("returned") ? "completed" : "cancelled";
//   } else if (activeStatuses.every((status) => status === "delivered")) {
//     order.deliveryStatus = "delivered";
//     order.orderStatus = "completed";
//   } else if (activeStatuses.includes("out_for_delivery")) {
//     order.deliveryStatus = "out_for_delivery";
//     order.orderStatus = "placed";
//   } else if (activeStatuses.includes("shipped")) {
//     order.deliveryStatus = "shipped";
//     order.orderStatus = "placed";
//   } else {
//     order.deliveryStatus = "pending";
//     order.orderStatus = "placed";
//   }

//   await order.save();

//   return {
//     success: true,
//     deliveryStatus: order.deliveryStatus,
//     orderStatus: order.orderStatus,
//     itemStatus: item.deliveryStatus,
//     message: "Product status updated successfully",
//   };
// };

// export const updateReturnRequestLogic = async (orderId, action, variantId, adminRemark) => {
//   try {
//     if (!orderId || !action) {
//       return { success: false, message: "Invalid request" };
//     }
   
//     const validActions = ["Approved", "Rejected"];
//     if (!validActions.includes(action)) {
//       return { success: false, message: "Invalid action" };
//     }

//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       return { success: false, message: "Invalid order ID" };
//     }

//     const foundOrder = await orderModel.findById(orderId);
//     if (!foundOrder) {
//       return { success: false, message: "Order not found" };
//     }

//     if (!foundOrder.returnedAt || foundOrder.returnedAt.length === 0) {
//       return { success: false, message: "No return request found" };
//     }

//     let returnRequest = null;
//     if (variantId) {
//       returnRequest = foundOrder.returnedAt.find(
//         (r) => r.variant && r.variant.toString() === variantId.toString() && r.returnRequestStatus === "Pending"
//       );
//     }

//     if (!returnRequest) {
//       returnRequest = foundOrder.returnedAt.find((r) => r.returnRequestStatus === "Pending");
//     }

//     if (!returnRequest) {
//       returnRequest = foundOrder.returnedAt[foundOrder.returnedAt.length - 1];
//     }

//     if (returnRequest.returnRequestStatus !== "Pending") {
//       return { success: false, message: `Return already ${returnRequest.returnRequestStatus.toLowerCase()}` };
//     }

//     returnRequest.returnRequestStatus = action;
//     returnRequest.adminRemark = adminRemark?.trim() || null; 

//     if (action === "Approved") {
//       const vId = returnRequest.variant;

//       if (vId) {
//         const item = foundOrder.orderItems.find(
//           (i) => i.variantId.toString() === vId.toString()
//         );
//         if (item) {
//           const returnQty = Math.min(
//             Number(returnRequest.quantity) || item.quantity,
//             item.quantity
//           );
//           await variantModel.updateOne(
//             { _id: vId },
//             { $inc: { stock: returnQty } }
//           );
//           item.deliveryStatus = "returned";
//         }
//       }
//     }

//     await foundOrder.save();
//     return { success: true, message: `Return request ${action.toLowerCase()} successfully` };

//   } catch (e) {
//     console.error("updateReturnRequestLogic error:", e);
//     return { success: false, message: "Something went wrong" };
//   }
// };





// import mongoose from "mongoose";
// import orderModel from "../models/orderModel.js";
// import variantModel from "../models/variantModel.js";

// ─── Constants ───────────────────────────────────────────────────────────────

// const VALID_ADMIN_STATUSES = ["pending", "shipped", "out_for_delivery", "delivered"];

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// const deriveOrderStatus = (orderItems) => {
//   const statuses = orderItems.map((item) => item.deliveryStatus || "pending");
//   const activeStatuses = statuses.filter(
//     (s) => s !== "cancelled" && s !== "returned"
//   );

//   if (activeStatuses.length === 0) {
//     if (statuses.includes("returned")) {
//       return { deliveryStatus: "returned", orderStatus: "returned" };
//     }
//     return { deliveryStatus: "cancelled", orderStatus: "cancelled" };
//   }

//   if (activeStatuses.every((s) => s === "delivered")) {
//     return { deliveryStatus: "delivered", orderStatus: "completed" };
//   }
//   if (activeStatuses.includes("out_for_delivery")) {
//     return { deliveryStatus: "out_for_delivery", orderStatus: "placed" };
//   }
//   if (activeStatuses.includes("shipped")) {
//     return { deliveryStatus: "shipped", orderStatus: "placed" };
//   }

//   return { deliveryStatus: "pending", orderStatus: "placed" };
// };

// // ─── Admin Services ───────────────────────────────────────────────────────────

// export const getOrderDetailsService = async (orderId) => {
//   if (!mongoose.Types.ObjectId.isValid(orderId))
//     return { success: false, message: "Invalid order ID" };

//   const order = await orderModel.findById(orderId);
//   return order
//     ? { success: true, order }
//     : { success: false, message: "Order not found" };
// };

// // Bulk — update all items at once (e.g. entire order ships together)
// export const updateAllItemsStatusService = async (orderId, deliveryStatus) => {
//   if (!mongoose.Types.ObjectId.isValid(orderId))
//     return { success: false, message: "Invalid order ID" };

//   if (!VALID_ADMIN_STATUSES.includes(deliveryStatus))
//     return { success: false, message: "Invalid status" };

//   const order = await orderModel.findById(orderId);
//   if (!order) return { success: false, message: "Order not found" };

//   order.orderItems.forEach((item) => {
//     // Never overwrite user-initiated statuses
//     if (item.deliveryStatus !== "cancelled" && item.deliveryStatus !== "returned") {
//       item.deliveryStatus = deliveryStatus;
//     }
//   });

//   const derived = deriveOrderStatus(order.orderItems);
//   order.deliveryStatus = derived.deliveryStatus;
//   order.orderStatus = derived.orderStatus;

//   await order.save();

//   return {
//     success: true,
//     deliveryStatus: order.deliveryStatus,
//     orderStatus: order.orderStatus,
//     message: "All items updated successfully",
//   };
// };

// // Single item — update one item and recalculate order status
// export const updateOrderItemStatusService = async (orderId, variantId, deliveryStatus) => {
//   if (!mongoose.Types.ObjectId.isValid(orderId))
//     return { success: false, message: "Invalid order ID" };

//   if (!mongoose.Types.ObjectId.isValid(variantId))
//     return { success: false, message: "Invalid variant ID" };

//   if (!VALID_ADMIN_STATUSES.includes(deliveryStatus))
//     return { success: false, message: "Invalid status" };

//   const order = await orderModel.findById(orderId);
//   if (!order) return { success: false, message: "Order not found" };

//   const item = order.orderItems.find(
//     (i) => i.variantId.toString() === variantId.toString()
//   );
//   if (!item) return { success: false, message: "Item not found in order" };

//   // Never overwrite user-initiated statuses
//   if (item.deliveryStatus === "cancelled")
//     return { success: false, message: "Cannot update a cancelled item" };

//   if (item.deliveryStatus === "returned")
//     return { success: false, message: "Cannot update a returned item" };

//   item.deliveryStatus = deliveryStatus;

//   const derived = deriveOrderStatus(order.orderItems);
//   order.deliveryStatus = derived.deliveryStatus;
//   order.orderStatus = derived.orderStatus;

//   await order.save();

//   return {
//     success: true,
//     itemStatus: item.deliveryStatus,
//     deliveryStatus: order.deliveryStatus,
//     orderStatus: order.orderStatus,
//     message: "Item status updated successfully",
//   };
// };

// // Return request — approve or reject
// export const updateReturnRequestService = async (orderId, action, variantId, adminRemark) => {
//   if (!orderId || !action)
//     return { success: false, message: "orderId and action are required" };

//   if (!["Approved", "Rejected"].includes(action))
//     return { success: false, message: "Action must be Approved or Rejected" };

//   if (!mongoose.Types.ObjectId.isValid(orderId))
//     return { success: false, message: "Invalid order ID" };

//   const order = await orderModel.findById(orderId);
//   if (!order) return { success: false, message: "Order not found" };

//   if (!order.returnedAt || order.returnedAt.length === 0)
//     return { success: false, message: "No return request found" };

//   // Find the pending return request — prefer matching variantId if provided
//   const returnRequest =
//     (variantId &&
//       order.returnedAt.find(
//         (r) =>
//           r.variant?.toString() === variantId.toString() &&
//           r.returnRequestStatus === "Pending"
//       )) ||
//     order.returnedAt.find((r) => r.returnRequestStatus === "Pending");

//   if (!returnRequest)
//     return { success: false, message: "No pending return request found" };

//   returnRequest.returnRequestStatus = action;
//   returnRequest.adminRemark = adminRemark?.trim() || null;

//   if (action === "Approved") {
//     const vId = returnRequest.variant;

//     if (vId) {
//       const item = order.orderItems.find(
//         (i) => i.variantId.toString() === vId.toString()
//       );

//       if (item) {
//         const returnQty = Math.min(
//           Number(returnRequest.quantity) || item.quantity,
//           item.quantity
//         );
//         await variantModel.updateOne({ _id: vId }, { $inc: { stock: returnQty } });
//         item.deliveryStatus = "returned";
//       }
//     }

//     // Recalculate order status after return approved
//     const derived = deriveOrderStatus(order.orderItems);
//     order.deliveryStatus = derived.deliveryStatus;
//     order.orderStatus = derived.orderStatus;
//   }

//   await order.save();
//   return { success: true, message: `Return request ${action.toLowerCase()} successfully` };
// };










// ─── service.js ───────────────────────────────────────────────────────────────

const STATUS_RANK = {
  pending:          0,
  shipped:          1,
  out_for_delivery: 2,
  delivered:        3,
};

const VALID_ADMIN_STATUSES = ["pending", "shipped", "out_for_delivery", "delivered"];

const deriveOrderStatus = (orderItems) => {
  const statuses = orderItems.map((item) => item.deliveryStatus || "pending");

  const activeStatuses = statuses.filter(
    (s) => s !== "cancelled" && s !== "returned"
  );

  if (activeStatuses.length === 0) {
    return statuses.includes("returned")
      ? { deliveryStatus: "returned",  orderStatus: "returned"   }
      : { deliveryStatus: "cancelled", orderStatus: "cancelled"  };
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

  return { deliveryStatus: "pending", orderStatus: "placed" };
};

const processRefund = async (order, returnRequest, item) => {
  const returnQty    = Math.min(Number(returnRequest.quantity) || item.quantity, item.quantity);
  const unitPrice    = item.price || (item.totalPrice / item.quantity);
  const refundAmount = +(unitPrice * returnQty).toFixed(2);

  if (refundAmount <= 0) return;

  await userModel.findByIdAndUpdate(order.userId, {
    $inc:  { walletBalance: refundAmount },
    $push: {
      walletHistory: {
        type:        "credit",
        amount:      refundAmount,
        description: `Refund for return — Order ${order.orderCode}`,
        date:        new Date(),
      },
    },
  });
};

export const updateAllItemsStatusService = async (orderId, deliveryStatus) => {
  if (!mongoose.Types.ObjectId.isValid(orderId))
    return { success: false, message: "Invalid order ID" };

  if (!VALID_ADMIN_STATUSES.includes(deliveryStatus))
    return { success: false, message: "Invalid status" };

  const order = await orderModel.findById(orderId);
  if (!order) return { success: false, message: "Order not found" };

  const newRank = STATUS_RANK[deliveryStatus];

  order.orderItems.forEach((item) => {
    if (item.deliveryStatus === "cancelled" || item.deliveryStatus === "returned") return;


    item.deliveryStatus = deliveryStatus;
  });

  const derived        = deriveOrderStatus(order.orderItems);
  order.deliveryStatus = derived.deliveryStatus;
  order.orderStatus    = derived.orderStatus;

  await order.save();

  return {
    success:        true,
    deliveryStatus: order.deliveryStatus,
    orderStatus:    order.orderStatus,
    message:        "All items updated successfully",
  };
};

export const updateOrderItemStatusService = async (orderId, variantId, deliveryStatus) => {
  if (!mongoose.Types.ObjectId.isValid(orderId))
    return { success: false, message: "Invalid order ID" };

  if (!mongoose.Types.ObjectId.isValid(variantId))
    return { success: false, message: "Invalid variant ID" };

  if (!VALID_ADMIN_STATUSES.includes(deliveryStatus))
    return { success: false, message: "Invalid status" };

  const order = await orderModel.findById(orderId);
  if (!order) return { success: false, message: "Order not found" };

  const item = order.orderItems.find(
    (i) => i.variantId.toString() === variantId.toString()
  );
  if (!item) return { success: false, message: "Item not found in order" };

  if (item.deliveryStatus === "cancelled")
    return { success: false, message: "Cannot update a cancelled item" };

  if (item.deliveryStatus === "returned")
    return { success: false, message: "Cannot update a returned item" };


  item.deliveryStatus = deliveryStatus;

  const derived        = deriveOrderStatus(order.orderItems);
  order.deliveryStatus = derived.deliveryStatus;
  order.orderStatus    = derived.orderStatus;

  await order.save();

  return {
    success:        true,
    itemStatus:     item.deliveryStatus,
    deliveryStatus: order.deliveryStatus,
    orderStatus:    order.orderStatus,
    message:        "Item status updated successfully",
  };
};

export const updateReturnRequestService = async (orderId, action, variantId, adminRemark) => {
  if (!orderId || !action)
    return { success: false, message: "orderId and action are required" };

  if (!["Approved", "Rejected"].includes(action))
    return { success: false, message: "Action must be Approved or Rejected" };

  if (!mongoose.Types.ObjectId.isValid(orderId))
    return { success: false, message: "Invalid order ID" };

  if (!variantId || !mongoose.Types.ObjectId.isValid(variantId))
    return { success: false, message: "Valid variantId is required" };

  const order = await orderModel.findById(orderId);
  if (!order) return { success: false, message: "Order not found" };

  if (!order.returnedAt?.length)
    return { success: false, message: "No return request found" };

  const returnRequest = order.returnedAt.find(
    (r) =>
      r.variant?.toString() === variantId.toString() &&
      r.returnRequestStatus  === "Pending"
  );

  if (!returnRequest)
    return { success: false, message: "No pending return request found for this item" };

  if (!adminRemark || !adminRemark.trim()) {
    return { success: false, message: "Reason (remark) is required to approve or reject a return request." };
  }

  returnRequest.returnRequestStatus = action;
  returnRequest.adminRemark         = adminRemark.trim();

  if (action === "Approved") {
    const item = order.orderItems.find(
      (i) => i.variantId.toString() === variantId.toString()
    );

    if (item) {
      const returnQty = Math.min(
        Number(returnRequest.quantity) || item.quantity,
        item.quantity
      );

      // Stock restore
      await variantModel.updateOne(
        { _id: variantId },
        { $inc: { stock: returnQty } }
      );

      // Item status update
      item.deliveryStatus = "returned";

      // Refund process
      await processRefund(order, returnRequest, item);
    }

    // Order level recalculate
    const derived        = deriveOrderStatus(order.orderItems);
    order.deliveryStatus = derived.deliveryStatus;
    order.orderStatus    = derived.orderStatus;
  }

  await order.save();
  return {
    success: true,
    message: `Return request ${action.toLowerCase()} successfully`,
  };
};