import {
  getOrderSuccess,
  getOrders,
  cancelRequestLogic,
  returnRequestLogic,
  getUserOrders,
} from "../service/orderService.js";
import { generateInvoicePDF } from "../service/orderService.js";
import { CartDataTake } from "../service/cartService.js";
import { normaliseOrder } from "../utilites/orderHelperfile.js";
import { findUserBlocked } from "../service/userService.js";
import orderModel from "../model/orderModel.js";

export const orderSuccessPage = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId) return res.redirect("/login");

    const result = await getOrderSuccess(userId, orderCode);

    if (!result.success) return res.redirect("/homepage");

    return res.render("Users/orderSuccess", {
      isLogged: req.session.user || "",
      order: result.order,
    });
  } catch (error) {
    console.error("orderSuccessPage error:", error);
    return res.redirect("/error");
  }
};

import { getCartCount } from "../service/cartService.js";

const getOrderById = async (orderId) => {
  const order = await orderModel
    .findById(orderId)
    .populate("orderItems.variantId")
    .populate("cancelledAt.cancelledProducts")
    .lean();

  return order;
};

export const orderDetailsLoad = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.session.user) {
      return res.redirect("/login");
    }

    if (!id) {
      return res.redirect("/order");
    }

    const userId = req.session.user._id || req.session.user.id;

    const isBlockedUser = await findUserBlocked(userId);
    if (isBlockedUser) {
      req.session.user = null;
      req.session.flashMessage = {
        type: "error",
        message: "Your account has been blocked.",
      };
      return res.redirect("/login");
    }

    const rawOrder = await getOrderById(id);

    if (!rawOrder) {
      return res.redirect("/order");
    }

    if (rawOrder.userId.toString() !== userId.toString()) {
      return res.redirect("/order");
    }

    const order = normaliseOrder(rawOrder);

    const cartData = await getCartCount(userId);

    return res.render("Users/orderDetailsUser", {
      isLogged: req.session.user || "",
      order: [order],
      pageActive: "ORDER",
      cart: cartData.count || 0,
    });
  } catch (e) {
    console.error("orderDetailsLoad error:", e);
    return res.redirect("/order");
  }
};

// export const downloadInvoice = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!req.session.user) {
//       return res.redirect("/login");
//     }

//     const userId = req.session.user._id || req.session.user.id;

//     const order = await orderModel
//       .findById(id)
//       .populate("orderItems.variantId")
//       .populate("cancelledAt.cancelledProducts")
//       .lean();

//     if (!order) {
//       return res.status(404).send("Order not found");
//     }

//     if (order.userId.toString() !== userId.toString()) {
//       return res.status(403).send("Access denied");
//     }

//     const filename = `invoice-${order.orderCode}.pdf`;
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

//     generateInvoicePDF(order, res);
//   } catch (error) {
//     console.error("downloadInvoice error:", error);
//     return res.status(500).send("Could not generate invoice");
//   }
// };

export const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id || req.session.user.id;

    const order = await orderModel
      .findById(id)
      .populate("orderItems.variantId")
      .populate("cancelledAt.cancelledProducts")
      .populate("returnedAt.variant")
      .lean();

    if (!order) {
      return res.status(404).send("Order not found");
    }

    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).send("Access denied");
    }

    const filename = `invoice-${order.orderCode}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    generateInvoicePDF(order, res);
  } catch (error) {
    console.error("downloadInvoice error:", error);
    return res.status(500).send("Could not generate invoice");
  }
};

export const cancellRequest = async (req, res) => {
  try {
    const { id, reason, remark, orderId } = req.body;
    const userId = req.session.user._id || req.session.user.id;

    const requestProgress = await cancelRequestLogic(
      id,
      reason,
      remark,
      orderId,
      userId,
    );

    if (!requestProgress.success) {
      return res.status(400).json({
        success: false,
        message: requestProgress.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: requestProgress.message,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const returnRequest = async (req, res) => {
  try {
    const { orderId, reason, remark, resolution, variant, quantity } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const result = await returnRequestLogic(
      userId,
      orderId,
      reason,
      remark,
      resolution,
      variant,
      quantity,
    );

    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json({ success: false, message: "Server error" });
  }
};

export const userOrdersLoad = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id || req.session.user.id;
    const page = parseInt(req.query.page) || 1;

    const result = await getUserOrders(userId, page, 6);
    const cartCount = await getCartCount(userId);

    if (!result.success) {
      return res.redirect("/");
    }

    return res.render("Users/orderListingPage", {
      isLogged: req.session.user || "",
      orders: result.orders,
      pagination: result.pagination,
      cart: cartCount.count || 0,
    });
  } catch (e) {
    console.error("userOrdersLoad error:", e);
    return res.redirect("/");
  }
};

export const orderFailedPage = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId) return res.redirect("/login");

    const order = await orderModel.findOne({ orderCode, userId }).lean();

    if (!order) return res.redirect("/order");

    return res.render("Users/orderFailed", {
      isLogged: req.session.user || "",
      order,  
    });
  } catch (error) {
    console.error("orderFailedPage error:", error);
    return res.redirect("/error");
  }
};