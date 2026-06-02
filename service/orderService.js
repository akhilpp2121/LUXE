import orderModel from "../model/orderModel.js";
import variantModel from "../model/variantModel.js";
import PDFDocument from "pdfkit";

// ─────────────────────────────────────────────────────────────────────────────
export const getOrderSuccess = async (userId, orderCode) => {
  try {
    if (!userId || !orderCode) {
      return { success: false, message: "Invalid request" };
    }
    const order = await orderModel.findOne({ orderCode, userId });
    if (!order) {
      return { success: false, message: "Order not found" };
    }
    return { success: true, order };
  } catch (error) {
    console.error("getOrderSuccess error:", error);
    return { success: false, message: error.message || "Something went wrong" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const getOrders = async (filter, page = 1, limit = 0) => {
  try {
    const totalOrders = await orderModel.countDocuments(filter);
    const skip = (page - 1) * limit;
    const data = await orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId")
      .populate("shippingAddressId")
      .populate("items.variantId")
      .populate({
        path: "cancelledAt.cancelledProducts",
        populate: { path: "productId", model: "Product" },
      });

    if (!data) {
      return { success: false, message: "Error while loading" };
    }

    return {
      success: true,
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
      },
    };
  } catch (e) {
    console.log(e);
    return { success: false, message: "Something went wrong" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const generateInvoicePDF = (order, stream) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(stream);

  const W      = doc.page.width;
  const MARGIN = 50;
  const COL_R  = W - MARGIN;

  const C = {
    dark:    "#0b1326",
    primary: "#1d4ed8",
    text:    "#1e2a45",
    muted:   "#64748b",
    border:  "#e2e8f0",
    white:   "#ffffff",
    green:   "#16a34a",
    red:     "#dc2626",
  };

  const fmt = (n) =>
    "Rs. " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const hr = (y, color = C.border) => {
    doc.moveTo(MARGIN, y).lineTo(COL_R, y).strokeColor(color).lineWidth(0.5).stroke();
    return y;
  };

  // Header band
  doc.rect(0, 0, W, 110).fill(C.dark);
  doc.font("Helvetica-Bold").fontSize(22).fillColor(C.white).text("LUXE THE DIGITAL ATELIER", MARGIN, 30);
  doc.font("Helvetica").fontSize(8).fillColor("#b7c4ff").text("LUXURY · FASHION · LIFESTYLE", MARGIN, 56);
  doc.font("Helvetica-Bold").fontSize(28).fillColor(C.white).text("INVOICE", 0, 32, { align: "right", width: W - MARGIN });
  doc.font("Helvetica").fontSize(9).fillColor("#b7c4ff").text(order.orderCode || "", 0, 64, { align: "right", width: W - MARGIN });

  // Meta row
  let y = 130;
  const invoiceDate  = new Date(order.orderDate || order.createdAt);
  const deliveryDate = order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : null;

  const metaLeft = [
    ["Invoice Date",   invoiceDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })],
    ["Order Code",     order.orderCode || "N/A"],
    ["Payment Method", (order.orderMethod || "N/A").toUpperCase()],
    ["Status",         (order.orderStatus || "").toUpperCase()],
  ];
  if (deliveryDate) {
    metaLeft.push(["Est. Delivery", deliveryDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })]);
  }

  doc.font("Helvetica-Bold").fontSize(10).fillColor(C.primary).text("INVOICE DETAILS", MARGIN, y);
  y += 16;
  metaLeft.forEach(([label, val]) => {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.muted).text(label, MARGIN, y);
    doc.font("Helvetica").fontSize(8).fillColor(C.text).text(val, MARGIN + 90, y);
    y += 14;
  });

  const addr  = order.shippingAddress || {};
  const addrY = 130;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(C.primary).text("SHIP TO", 320, addrY);

  let ay = addrY + 16;
  const addrLines = [
    addr.username || "",
    addr.street_address || "",
    addr.landmark || "",
    [addr.city, addr.state].filter(Boolean).join(", "),
    [addr.country, addr.postal_code].filter(Boolean).join(" — "),
    addr.phone_number ? "Ph: " + addr.phone_number : "",
  ].filter(Boolean);

  addrLines.forEach((line) => {
    doc.font("Helvetica").fontSize(8).fillColor(C.text).text(line, 320, ay, { width: COL_R - 320 });
    ay += 13;
  });

  // Items table
  y = Math.max(y, ay) + 24;
  hr(y);
  y += 10;

  doc.rect(MARGIN, y, COL_R - MARGIN, 20).fill(C.primary);
  const cols = {
    name:  { x: MARGIN + 8,   w: 220 },
    sku:   { x: MARGIN + 228, w: 80  },
    qty:   { x: MARGIN + 308, w: 40  },
    price: { x: MARGIN + 348, w: 70  },
    total: { x: MARGIN + 418, w: 70  },
  };

  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white);
  doc.text("PRODUCT",    cols.name.x,  y + 6);
  doc.text("SKU",        cols.sku.x,   y + 6);
  doc.text("QTY",        cols.qty.x,   y + 6);
  doc.text("UNIT PRICE", cols.price.x, y + 6);
  doc.text("TOTAL",      cols.total.x, y + 6);
  y += 26;

  const cancelledVIds = new Set(
    (order.cancelledAt || []).flatMap((ca) =>
      (ca.cancelledProducts || []).map((cp) =>
        cp && cp._id ? cp._id.toString() : cp.toString()
      )
    )
  );

  (order.orderItems || []).forEach((item, idx) => {
    const variant   = item.variantId && typeof item.variantId === "object" ? item.variantId : null;
    const sku       = variant?.SKU || String(item.variantId || "").slice(-8).toUpperCase();
    const variantId = variant ? variant._id.toString() : String(item.variantId || "");
    const isCancelled = cancelledVIds.has(variantId);
    const rowHeight = 28;
    const rowBg     = idx % 2 === 0 ? "#f8fafc" : C.white;

    doc.rect(MARGIN, y, COL_R - MARGIN, rowHeight).fill(rowBg);

    const textY     = y + 9;
    const textColor = isCancelled ? C.muted : C.text;

    doc.font("Helvetica-Bold").fontSize(8).fillColor(textColor)
       .text(item.productName || "", cols.name.x, textY, { width: cols.name.w - 4, ellipsis: true });

    if (item.variantName) {
      doc.font("Helvetica").fontSize(7).fillColor(C.muted)
         .text(item.variantName, cols.name.x, textY + 10, { width: cols.name.w - 4 });
    }

    doc.font("Helvetica").fontSize(8).fillColor(textColor)
       .text(sku,                   cols.sku.x,   textY)
       .text(String(item.quantity), cols.qty.x,   textY)
       .text(fmt(item.price),       cols.price.x, textY)
       .text(fmt(item.totalPrice),  cols.total.x, textY);

    if (isCancelled) {
      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.red)
         .text("CANCELLED", cols.name.x, textY + (item.variantName ? 10 : 10));
    }

    doc.moveTo(MARGIN, y + rowHeight).lineTo(COL_R, y + rowHeight)
       .strokeColor(C.border).lineWidth(0.3).stroke();

    y += rowHeight;
  });

  // Totals
  y += 16;
  const totalsX = 360;
  const totalsW = COL_R - totalsX;

  const addTotalRow = (label, value, bold = false, color = C.text) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 9 : 8)
       .fillColor(C.muted).text(label, totalsX, y);
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 9 : 8)
       .fillColor(color).text(value, totalsX, y, { align: "right", width: totalsW });
    y += bold ? 16 : 13;
  };

  addTotalRow("Subtotal", fmt(order.subTotal));
  const shipping = order.shippingCharge || 0;
  addTotalRow("Shipping", shipping === 0 ? "FREE" : fmt(shipping), false, C.green);
  if (order.couponApplied && order.couponApplied > 0) {
    addTotalRow("Coupon Discount", "- " + fmt(order.couponApplied), false, C.green);
  }
  if (order.taxAmount && order.taxAmount > 0) {
    addTotalRow("Tax", fmt(order.taxAmount));
  }
  hr(y);
  y += 8;
  addTotalRow("GRAND TOTAL", fmt(order.totalAmount), true, C.primary);

  // Notes
  y += 24;
  hr(y);
  y += 12;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.text).text("Notes", MARGIN, y);
  y += 14;
  doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(
    "Thank you for shopping with LUXE THE DIGITAL ATELIER. " +
    "For any queries please contact support@digitalatelier.com. " +
    "Returns accepted within 30 days of delivery in original packaging.",
    MARGIN, y, { width: COL_R - MARGIN }
  );

  // Footer
  const pageH = doc.page.height;
  doc.rect(0, pageH - 40, W, 40).fill(C.dark);
  doc.font("Helvetica").fontSize(7).fillColor("#b7c4ff").text(
    "© 2024 THE DIGITAL ATELIER  ·  All Rights Reserved  ·  www.digitalatelier.com",
    0, pageH - 24, { align: "center", width: W }
  );

  doc.end();
};

// ─────────────────────────────────────────────────────────────────────────────
export const cancelRequestLogic = async (id, reason, remark, orderid) => {
  try {
    if (!id || !orderid) {
      return { success: false, message: "Invalid cancellation request" };
    }

    const requestProgress = await orderModel.findOne({ _id: orderid });
    if (!requestProgress) {
      return { success: false, message: "Order not found" };
    }

    if ((requestProgress.deliveryStatus || "").toLowerCase() !== "pending") {
      return { success: false, message: "Order can only be cancelled before it is shipped" };
    }

    if (!requestProgress.cancelledAt) {
      requestProgress.cancelledAt = [];
    }

    // ── Cancel ALL ──────────────────────────────────────────────────
    if (id === "ALL") {
      requestProgress.expectedDeliveryDate = null;
      const products = [];
      for (const i of requestProgress.orderItems) {
        products.push(i.variantId);
        await variantModel.updateOne({ _id: i.variantId }, { $inc: { stock: i.quantity } });
      }
      requestProgress.subTotal       = 0;
      requestProgress.shippingCharge = 0;
      requestProgress.taxAmount      = 0;
      requestProgress.totalAmount    = 0;
      requestProgress.orderStatus    = "cancelled";
      requestProgress.deliveryStatus = "cancelled";
      requestProgress.cancelledAt.push({
        reason:           reason || "",
        cancelledBy:      "user",
        remarks:          remark || "",
        requestedAt:      new Date(),
        cancelledProducts: products,
      });
      await requestProgress.save();
      return { success: true, message: "Order got cancelled" };
    }

    // ── Cancel single item ──────────────────────────────────────────
    const item = requestProgress.orderItems.find(
      (v) => v.variantId.toString() === id.toString()
    );
    if (!item) {
      return { success: false, message: "Item not found in order" };
    }

    const quantity = item.quantity;

    requestProgress.cancelledAt.push({
      reason:           reason || "",
      cancelledBy:      "user",
      remarks:          remark || "",
      requestedAt:      new Date(),
      cancelledProducts: [item.variantId], // store ObjectId, not string
    });

    // Build cancelled set after pushing
    const cancelledSet = new Set();
    requestProgress.cancelledAt.forEach((cancel) => {
      cancel.cancelledProducts.forEach((pid) => {
        cancelledSet.add(pid.toString());
      });
    });

    // Recalculate active subtotal
    const activeSubTotal = requestProgress.orderItems
      .filter((i) => !cancelledSet.has(i.variantId.toString()))
      .reduce((sum, i) => sum + i.price * i.quantity, 0);

    requestProgress.subTotal = +activeSubTotal.toFixed(2);

    // Check if all items cancelled
    if (cancelledSet.size === requestProgress.orderItems.length) {
      requestProgress.expectedDeliveryDate = null;
      requestProgress.orderStatus          = "cancelled";
      requestProgress.deliveryStatus       = "cancelled";
      requestProgress.shippingCharge       = 0;
      requestProgress.taxAmount            = 0;
    }

    // Recalculate shipping based on new subtotal
    const newShipping = requestProgress.shippingCharge > 0
      ? (activeSubTotal >= 999 ? 0 : 99)
      : 0;
    requestProgress.shippingCharge = newShipping;
    requestProgress.totalAmount    = +(activeSubTotal + newShipping).toFixed(2);

    await variantModel.updateOne({ _id: item.variantId }, { $inc: { stock: quantity } });
    await requestProgress.save();

    return { success: true, message: "Item got cancelled" };

  } catch (e) {
    console.error("cancelRequestLogic error:", e.message, e.stack);
    return { success: false, message: e.message || "Something went wrong" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const returnRequestLogic = async (orderId, reason, remark, resolution, variantId) => {
  try {
    if (!orderId || !variantId) {
      return { success: false, message: "Order ID and item are required" };
    }
    if (!reason || reason.trim() === "") {
      return { success: false, message: "Reason is required for return" };
    }

    const order = await orderModel.findOne({ _id: orderId });
    if (!order) {
      return { success: false, message: "Order not found" };
    }
    if (order.deliveryStatus !== "delivered") {
      return { success: false, message: "Return is only allowed after delivery" };
    }

    if (!order.returnedAt) {
      order.returnedAt = [];
    }

    /* Handle "ALL" case - create separate return entries for each non-cancelled item */
    if (variantId === "ALL" || variantId.toUpperCase() === "ALL") {
      const nonCancelledItems = (order.orderItems || []).filter(item => {
        const isCancelled = (order.cancelledAt || []).some(ca => {
          return (ca.cancelledProducts || []).some(cp => 
            (cp && cp._id ? cp._id.toString() : String(cp)) === (item.variantId ? item.variantId.toString() : String(item.variantId))
          );
        });
        return !isCancelled;
      });

      if (nonCancelledItems.length === 0) {
        return { success: false, message: "No items available to return" };
      }

      nonCancelledItems.forEach(item => {
        order.returnedAt.push({
          reason:      reason.trim(),
          remark:      remark || "",
          resolution:  resolution || "",
          variant:     item.variantId,
          requestedAt: new Date(),
          returnRequestStatus: "Pending",
        });
      });
    } else {
      /* Single item return */
      order.returnedAt.push({
        reason:      reason.trim(),
        remark:      remark || "",
        resolution:  resolution || "",
        variant:     variantId,
        requestedAt: new Date(),
        returnRequestStatus: "Pending",
      });
    }

    await order.save();
    const itemCount = variantId === "ALL" || variantId.toUpperCase() === "ALL" 
      ? "All eligible items return request submitted" 
      : "Return request submitted successfully";
    return { success: true, message: itemCount };

  } catch (e) {
    console.error("returnRequestLogic error:", e);
    return { success: false, message: "Server error" };
  }
};


export const getUserOrders = async (userId, page = 1, limit = 6) => {
  try {
    if (!userId) return { success: false, message: "User not found" };

    const filter = { userId };
    const totalOrders = await orderModel.countDocuments(filter);
    const skip = (page - 1) * limit;

    const orders = await orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "orderItems.variantId",
        model: "Variant",
      })
      .populate({
        path: "cancelledAt.cancelledProducts",
        model: "Variant",
      })
      .lean();

    return {
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
      },
    };
  } catch (e) {
    console.error("getUserOrders error:", e);
    return { success: false, message: "Something went wrong" };
  }
};