import {
  getOrderSuccess,getOrders,cancelRequestLogic,returnRequestLogic,getUserOrders

  
} from "../service/orderService.js";
import { generateInvoicePDF } from "../service/orderService.js";
import { CartDataTake } from "../service/cartService.js";

export const orderSuccessPage = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId) return res.redirect('/login');

    const result = await getOrderSuccess(userId, orderCode);

    if (!result.success) return res.redirect('/homepage');

    return res.render("Users/orderSuccess", {
      isLogged: req.session.user || '',
      order: result.order
    });

  } catch (error) {
    console.error("orderSuccessPage error:", error);
    return res.redirect('/error');
  }
};



import orderModel from "../model/orderModel.js";
import { getCartCount } from "../service/cartService.js"; // adjust path if needed
 
// ─────────────────────────────────────────────────────────────────────────────
// STATUS MAP  — schema stores lowercase, template expects uppercase
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  placed:    "PENDING",
  cancelled: "CANCELLED",
  completed: "COMPLETED",
};
 
// ─────────────────────────────────────────────────────────────────────────────
// getOrderById  — fetches & populates a single order
// ─────────────────────────────────────────────────────────────────────────────
const getOrderById = async (orderId) => {
  const order = await orderModel
    .findById(orderId)
    .populate("orderItems.variantId")           // gets variant image[], stock, etc.
    .populate("cancelledAt.cancelledProducts")  // gets cancelled variant docs
    .lean(); 
                                   // plain JS object — no .toObject() needed
 
  return order;
};
 
// ─────────────────────────────────────────────────────────────────────────────
// normaliseOrder  — maps schema fields → what the EJS template expects
// ─────────────────────────────────────────────────────────────────────────────
const normaliseOrder = (o) => ({
  // ── identity ──────────────────────────────────────────────────────
  _id:                  o._id,
  orderCode:            o.orderCode,
  orderDate:            o.orderDate,
  expectedDeliveryDate: o.expectedDeliveryDate,
  orderMethod:          o.orderMethod,
 
  // ── status (uppercased for template) ──────────────────────────────
  orderStatus: STATUS_MAP[o.orderStatus] || o.orderStatus.toUpperCase(),
 
  // ── items (schema field is 'orderItems') ──────────────────────────
  orderItems: (o.orderItems || []).map((item) => ({
    productName: item.productName,
    variantName: item.variantName,
    price:       item.price,
    quantity:    item.quantity,
    totalPrice:  item.totalPrice,
    variantId:   item.variantId,   // populated Variant doc (has .image[], ._id)
  })),
 
  // ── address (already embedded in doc, no populate needed) ─────────
  shippingAddress: {
    username:       o.shippingAddress?.username       || "",
    phone_number:   o.shippingAddress?.phone_number   || "",
    street_address: o.shippingAddress?.street_address || "",
    landmark:       o.shippingAddress?.landmark       || "",
    city:           o.shippingAddress?.city           || "",
    state:          o.shippingAddress?.state          || "",
    postal_code:    o.shippingAddress?.postal_code    || "",
    country:        o.shippingAddress?.country        || "",
  },
 
  // ── financials ────────────────────────────────────────────────────
  subTotal:      o.subTotal      || 0,
  shippingCharge:o.shippingCharge||0,
  taxAmount:     o.taxAmount     || 0,
  couponApplied: o.couponApplied || 0,
  totalAmount:   o.totalAmount   || 0,
  deliveryStatus:o.deliveryStatus||'pending',
 
  // ── cancellations ─────────────────────────────────────────────────
  cancelledAt: (o.cancelledAt || []).map((ca) => ({

    reason:              ca.reason,
    remarks:             ca.remarks,
    requestedAt:         ca.requestedAt,
    cancelRequestStatus: ca.cancelRequestStatus,
    cancelledProducts:   ca.cancelledProducts || [], // populated Variant docs
  })),
 
  // ── returns ───────────────────────────────────────────────────────
  returnedAt: (o.returnedAt || []).map((r) => ({
    reason:              r.reason,
    remark:              r.remark,
    resolution:          r.resolution,
    requestedAt:         r.requestedAt,
    returnRequestStatus: r.returnRequestStatus,
  })),
});
 
// ─────────────────────────────────────────────────────────────────────────────
// orderDetailsLoad  — GET /checkout/details/:id
// ─────────────────────────────────────────────────────────────────────────────
export const orderDetailsLoad = async (req, res) => {
  try {
    const { id } = req.params;
 
    // Guard — must be logged in
    if (!req.session.user) {
      return res.redirect("/login");
    }
 
    // Guard — id must exist
    if (!id) {
      return res.redirect("/order");
    }
 
    const userId = req.session.user._id || req.session.user.id;
 
    // Fetch order
    const rawOrder = await getOrderById(id);
 
    // Guard — order must exist
    if (!rawOrder) {
      return res.redirect("/order");
    }
 
    // Guard — order must belong to the logged-in user
    if (rawOrder.userId.toString() !== userId.toString()) {
      return res.redirect("/order");
    }
 
    // Normalise for template
    const order = normaliseOrder(rawOrder);
 
    // Cart badge count
    const cartData = await getCartCount(userId);
 
    return res.render("Users/orderDetailsUser", {
      isLogged:   req.session.user || "",
      order:      [order],          // template reads order[0]
      pageActive: "ORDER",
      cart:       cartData.count || 0,
    });
 
  } catch (e) {
    console.error("orderDetailsLoad error:", e);
    return res.redirect("/order");
  }
};





// ─────────────────────────────────────────────────────────────────────────────
// downloadInvoice  —  GET /checkout/invoice/:id
// ─────────────────────────────────────────────────────────────────────────────
export const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id || req.session.user.id;

    // Fetch order with populated variant (for SKU)
    const order = await orderModel
      .findById(id)
      .populate("orderItems.variantId")
      .populate("cancelledAt.cancelledProducts")
      .lean();

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Security — user can only download their own invoice
    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).send("Access denied");
    }

    // Set headers so browser downloads the file
    const filename = `invoice-${order.orderCode}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Generate and pipe PDF directly to response
    generateInvoicePDF(order, res);

  } catch (error) {
    console.error("downloadInvoice error:", error);
    return res.status(500).send("Could not generate invoice");
  }
};



export const cancellRequest = async (req, res) => {
    try {
        const { id, reason, remark, orderId } = req.body

        const requestProgress = await cancelRequestLogic(id, reason, remark, orderId)

        if (!requestProgress.success) {
            return res.status(400).json({        // 400 Bad Request, not 401
                success: false,
                message: requestProgress.message
            })
        }

        return res.status(200).json({
            success: true,
            message: requestProgress.message
        })

    } catch (e) {
        console.log(e)
        return res.status(500).json({            // 500 for unexpected server errors
            success: false,
            message: "Server error"
        })
    }
}

// export const returnRequest = async (req, res) => {
//     try {
//         const { orderId, reason, remark, resolution, variant } = req.body

//         const returnProgress = await returnRequestLogic(orderId, reason, remark, resolution, variant)

//         if (!returnProgress.success) {
//             return res.status(400).json({
//                 success: false,
//                 message: returnProgress.message
//             })
//         }

//         return res.status(200).json({
//             success: true,
//             message: returnProgress.message
//         })

//     } catch (e) {
//         console.log(e)
//         return res.status(500).json({
//             success: false,
//             message: "Server error"
//         })
//     }
// }


export const returnRequest = async (req, res) => {
  try {
    const { orderId, reason, remark, resolution, variant, quantity } = req.body;

    if (!orderId || !variant) {
      return res.json({ success: false, message: "Order ID and item are required" });
    }
    if (!reason?.trim()) {
      return res.json({ success: false, message: "Reason is required" });
    }
    if (!resolution?.trim()) {
      return res.json({ success: false, message: "Resolution is required" });
    }

    const order = await orderModel.findOne({ _id: orderId });
    if (!order) return res.json({ success: false, message: "Order not found" });
    if (order.deliveryStatus !== "delivered") {
      return res.json({ success: false, message: "Return only allowed after delivery" });
    }

    if (!order.returnedAt) order.returnedAt = [];

    // Build cancelled variant ID set
    const cancelledVIds = new Set(
      (order.cancelledAt || []).flatMap(ca =>
        (ca.cancelledProducts || []).map(cp =>
          cp?._id ? cp._id.toString() : String(cp)
        )
      )
    );

    // Build already-returned variant ID set
    const alreadyReturnedVIds = new Set(
      (order.returnedAt || []).map(r =>
        r.variant ? r.variant.toString() : ""
      )
    );

    const isAll = variant === "ALL";

    if (isAll) {
      const eligible = (order.orderItems || []).filter(item => {
        const vid = item.variantId?.toString() ?? "";
        return !cancelledVIds.has(vid) && !alreadyReturnedVIds.has(vid);
      });

      if (eligible.length === 0) {
        return res.json({ success: false, message: "All items already returned or cancelled" });
      }

      eligible.forEach(item => {
        order.returnedAt.push({
          reason:              reason.trim(),
          remark:              remark || "",
          resolution,
          variant:             item.variantId,
          quantity:            item.quantity,        // full qty for ALL
          requestedAt:         new Date(),
          returnRequestStatus: "Pending",
        });
      });

      await order.save();
      return res.json({ success: true, message: "Return request submitted for all items" });
    }

    // — Single item —
    if (cancelledVIds.has(variant)) {
      return res.json({ success: false, message: "Cannot return a cancelled item" });
    }
    if (alreadyReturnedVIds.has(variant)) {
      return res.json({ success: false, message: "Return already requested for this item" });
    }

    const orderItem = (order.orderItems || []).find(
      item => item.variantId?.toString() === variant
    );
    if (!orderItem) {
      return res.json({ success: false, message: "Item not found in this order" });
    }

    // Validate quantity
    const requestedQty = parseInt(quantity, 10);
    if (!requestedQty || requestedQty < 1 || requestedQty > orderItem.quantity) {
      return res.json({
        success: false,
        message: `Quantity must be between 1 and ${orderItem.quantity}`,
      });
    }

    order.returnedAt.push({
      reason:              reason.trim(),
      remark:              remark || "",
      resolution,
      variant,
      quantity:            requestedQty,
      requestedAt:         new Date(),
      returnRequestStatus: "Pending",
    });

    await order.save();
    return res.json({ success: true, message: "Return request submitted successfully" });

  } catch (e) {
    console.error("returnRequest error:", e);
    return res.json({ success: false, message: "Server error" });
  }
};


export const userOrdersLoad = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id || req.session.user.id;
    const page   = parseInt(req.query.page) || 1;

    const result = await getUserOrders(userId, page, 6);

    if (!result.success) {
      return res.redirect("/");
    }

    return res.render("Users/orderListingPage", {
      isLogged:   req.session.user || "",
      orders:     result.orders,
      pagination: result.pagination,
    });

  } catch (e) {
    console.error("userOrdersLoad error:", e);
    return res.redirect("/");
  }
};
