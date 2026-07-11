import orderModel from "../model/orderModel.js";
import variantModel from "../model/variantModel.js";
import PDFDocument from "pdfkit";
import { creditWallet } from "./walletService.js";

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

export const generateInvoicePDF = (order, stream) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(stream);

  const W = doc.page.width;
  const MARGIN = 50;
  const COL_R = W - MARGIN;

  const C = {
    dark: "#0b1326",
    primary: "#1d4ed8",
    text: "#1e2a45",
    muted: "#64748b",
    border: "#e2e8f0",
    white: "#ffffff",
    green: "#16a34a",
    red: "#dc2626",
    amber: "#d97706",
  };

  const fmt = (n) =>
    "Rs. " +
    Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const hr = (y, color = C.border) => {
    doc
      .moveTo(MARGIN, y)
      .lineTo(COL_R, y)
      .strokeColor(color)
      .lineWidth(0.5)
      .stroke();
    return y;
  };

  // Header band
  doc.rect(0, 0, W, 110).fill(C.dark);
  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor(C.white)
    .text("LUXE THE DIGITAL ATELIER", MARGIN, 30);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#b7c4ff")
    .text("LUXURY · FASHION · LIFESTYLE", MARGIN, 56);
  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor(C.white)
    .text("INVOICE", 0, 32, { align: "right", width: W - MARGIN });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#b7c4ff")
    .text(order.orderCode || "", 0, 64, { align: "right", width: W - MARGIN });

  // Meta row
  let y = 130;
  const invoiceDate = new Date(order.orderDate || order.createdAt);
  const deliveryDate = order.expectedDeliveryDate
    ? new Date(order.expectedDeliveryDate)
    : null;

  const metaLeft = [
    [
      "Invoice Date",
      invoiceDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    ],
    ["Order Code", order.orderCode || "N/A"],
    ["Payment Method", (order.orderMethod || "N/A").toUpperCase()],
    ["Status", (order.orderStatus || "").toUpperCase()],
  ];
  if (deliveryDate) {
    metaLeft.push([
      "Est. Delivery",
      deliveryDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    ]);
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(C.primary)
    .text("INVOICE DETAILS", MARGIN, y);
  y += 16;
  metaLeft.forEach(([label, val]) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(C.muted)
      .text(label, MARGIN, y);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(C.text)
      .text(val, MARGIN + 90, y);
    y += 14;
  });

  const addr = order.shippingAddress || {};
  const addrY = 130;
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(C.primary)
    .text("SHIP TO", 320, addrY);

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
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(C.text)
      .text(line, 320, ay, { width: COL_R - 320 });
    ay += 13;
  });

  // Items table
  y = Math.max(y, ay) + 24;
  hr(y);
  y += 10;

  doc.rect(MARGIN, y, COL_R - MARGIN, 20).fill(C.primary);
  const cols = {
    name: { x: MARGIN + 8, w: 220 },
    sku: { x: MARGIN + 228, w: 80 },
    qty: { x: MARGIN + 308, w: 40 },
    price: { x: MARGIN + 348, w: 70 },
    total: { x: MARGIN + 418, w: 70 },
  };

  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white);
  doc.text("PRODUCT", cols.name.x, y + 6);
  doc.text("SKU", cols.sku.x, y + 6);
  doc.text("QTY", cols.qty.x, y + 6);
  doc.text("UNIT PRICE", cols.price.x, y + 6);
  doc.text("TOTAL", cols.total.x, y + 6);
  y += 26;

  const cancelledVIds = new Set(
    (order.cancelledAt || []).flatMap((ca) =>
      (ca.cancelledProducts || []).map((cp) =>
        cp && cp._id ? cp._id.toString() : cp.toString(),
      ),
    ),
  );

  const RETURN_STATUS_RANK = { Approved: 3, Pending: 2, Rejected: 1 };
  const returnMap = new Map();
  (order.returnedAt || []).forEach((r) => {
    const vid =
      r.variant && r.variant._id
        ? r.variant._id.toString()
        : String(r.variant || "");
    if (!vid) return;
    const existing = returnMap.get(vid);
    if (
      !existing ||
      RETURN_STATUS_RANK[r.returnRequestStatus] >
        RETURN_STATUS_RANK[existing.returnRequestStatus]
    ) {
      returnMap.set(vid, r);
    }
  });

  (order.orderItems || []).forEach((item, idx) => {
    const variant =
      item.variantId && typeof item.variantId === "object"
        ? item.variantId
        : null;
    const sku =
      variant?.SKU ||
      String(item.variantId || "")
        .slice(-8)
        .toUpperCase();
    const variantId = variant
      ? variant._id.toString()
      : String(item.variantId || "");
    const isCancelled = cancelledVIds.has(variantId);
    const returnRecord = returnMap.get(variantId);
    const rowHeight = 28;
    const rowBg = idx % 2 === 0 ? "#f8fafc" : C.white;

    doc.rect(MARGIN, y, COL_R - MARGIN, rowHeight).fill(rowBg);

    const textY = y + 9;
    const textColor = isCancelled ? C.muted : C.text;

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(textColor)
      .text(item.productName || "", cols.name.x, textY, {
        width: cols.name.w - 4,
        ellipsis: true,
      });

    if (item.variantName) {
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(C.muted)
        .text(item.variantName, cols.name.x, textY + 10, {
          width: cols.name.w - 4,
        });
    }

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(textColor)
      .text(sku, cols.sku.x, textY)
      .text(String(item.quantity), cols.qty.x, textY)
      .text(fmt(item.price), cols.price.x, textY)
      .text(fmt(item.totalPrice), cols.total.x, textY);

    if (isCancelled) {
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(C.red)
        .text("CANCELLED", cols.name.x, textY + (item.variantName ? 10 : 10));
    } else if (returnRecord) {
      const badgeColor =
        returnRecord.returnRequestStatus === "Approved"
          ? C.green
          : returnRecord.returnRequestStatus === "Rejected"
            ? C.red
            : C.amber;
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(badgeColor)
        .text(
          `RETURN ${returnRecord.returnRequestStatus.toUpperCase()}`,
          cols.name.x,
          textY + (item.variantName ? 10 : 10),
        );
    }

    doc
      .moveTo(MARGIN, y + rowHeight)
      .lineTo(COL_R, y + rowHeight)
      .strokeColor(C.border)
      .lineWidth(0.3)
      .stroke();

    y += rowHeight;
  });

  // Totals
  y += 16;
  const totalsX = 360;
  const totalsW = COL_R - totalsX;

  const addTotalRow = (label, value, bold = false, color = C.text) => {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(bold ? 9 : 8)
      .fillColor(C.muted)
      .text(label, totalsX, y);
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(bold ? 9 : 8)
      .fillColor(color)
      .text(value, totalsX, y, { align: "right", width: totalsW });
    y += bold ? 16 : 13;
  };

  const SHIPPING_THRESHOLD = 999;
  const SHIPPING_FEE = 99;
  const GST_RATE = 0.05;

  // Recalculate from active items only — "active" means not cancelled AND
  // not an approved return. Pending/rejected returns still count toward
  // the total since the return isn't finalized (mirrors cancellation logic,
  // where only a finalized outcome changes what's billed).
  const approvedReturnVIds = new Set(
    (order.returnedAt || [])
      .filter((r) => r.returnRequestStatus === "Approved")
      .map((r) =>
        r.variant && r.variant._id
          ? r.variant._id.toString()
          : String(r.variant || ""),
      ),
  );

  const activeSubTotal = (order.orderItems || []).reduce((sum, item) => {
    const variantId =
      item.variantId && typeof item.variantId === "object"
        ? item.variantId._id.toString()
        : String(item.variantId || "");
    const isExcluded =
      cancelledVIds.has(variantId) || approvedReturnVIds.has(variantId);
    return isExcluded ? sum : sum + (item.totalPrice || 0);
  }, 0);

  // BUGFIX: if every item is cancelled/returned (or there are none),
  // activeSubTotal is 0 — which is < 999, so a naive threshold check would
  // charge shipping on an order with nothing left, and would also apply
  // the coupon discount to an empty cart, potentially driving the total
  // negative. hasActiveItems guards both shipping and coupon, matching the
  // order details page logic exactly.
  const hasActiveItems =
    (order.orderItems || []).length > 0 && activeSubTotal > 0;

  const gstAmount = Math.round(activeSubTotal * GST_RATE);
  const shippingCharge = hasActiveItems
    ? activeSubTotal >= SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_FEE
    : 0;
  const couponDiscount = hasActiveItems ? order.couponApplied || 0 : 0;

  // Final safety net: grand total must never print as negative.
  const grandTotalRaw =
    activeSubTotal + gstAmount + shippingCharge - couponDiscount;
  const grandTotal = Math.max(0, grandTotalRaw);

  // Subtotal
  addTotalRow("Subtotal (Taxable Value)", fmt(activeSubTotal));

  // GST
  addTotalRow("GST @ 5% (Clothing)", fmt(gstAmount), false, C.amber);

  // Shipping — label explains free or why charge was applied
  const shippingLabel = !hasActiveItems
    ? "Shipping (No active items)"
    : shippingCharge === 0
      ? "Shipping (Free above Rs. 999)"
      : "Shipping (Active total below Rs. 999)";

  addTotalRow(
    shippingLabel,
    shippingCharge === 0 ? "FREE" : fmt(shippingCharge),
    false,
    shippingCharge === 0 ? C.green : C.red,
  );

  // Coupon
  if (couponDiscount > 0) {
    addTotalRow("Coupon Discount", "- " + fmt(couponDiscount), false, C.green);
  }

  hr(y);
  y += 8;
  addTotalRow("GRAND TOTAL (Incl. GST)", fmt(grandTotal), true, C.primary);

  // Notes
  y += 24;
  hr(y);
  y += 12;
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(C.text)
    .text("Notes", MARGIN, y);
  y += 14;
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(C.muted)
    .text(
      "Thank you for shopping with LUXE THE DIGITAL ATELIER. " +
        "For any queries please contact support@digitalatelier.com. " +
        "Returns accepted within 30 days of delivery in original packaging.",
      MARGIN,
      y,
      { width: COL_R - MARGIN },
    );

  // ── Return Requests section ──
  if (order.returnedAt && order.returnedAt.length > 0) {
    y += 30;

    // Page-break safety: if there isn't enough room left, start a fresh page
    if (y > doc.page.height - 160) {
      doc.addPage();
      y = 50;
    }

    hr(y);
    y += 12;
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(C.primary)
      .text("RETURN REQUESTS", MARGIN, y);
    y += 16;

    order.returnedAt.forEach((r) => {
      // Page-break safety per-entry too, in case there are many returns
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }

      const variant =
        r.variant && typeof r.variant === "object" ? r.variant : null;
      const label = variant?.SKU
        ? `SKU: ${variant.SKU}`
        : `Variant: ${String(r.variant || "")
            .slice(-8)
            .toUpperCase()}`;

      const statusColor =
        r.returnRequestStatus === "Approved"
          ? C.green
          : r.returnRequestStatus === "Rejected"
            ? C.red
            : C.amber;

      const reqDate = r.requestedAt
        ? new Date(r.requestedAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "N/A";

      const entryTop = y;

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(C.text)
        .text(label, MARGIN, y, { continued: true })
        .font("Helvetica")
        .fillColor(C.muted)
        .text(`   ·   Qty: ${r.quantity || 1}   ·   Requested: ${reqDate}`, {
          continued: false,
        });
      y += 12;

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(C.text)
        .text(`Reason: ${r.reason || "N/A"}`, MARGIN, y, {
          width: COL_R - MARGIN - 100,
        });
      y += 12;

      if (r.remark) {
        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor(C.muted)
          .text(`Remark: ${r.remark}`, MARGIN, y, {
            width: COL_R - MARGIN - 100,
          });
        y += 11;
      }

      if (r.adminRemark) {
        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor(C.muted)
          .text(`Admin note: ${r.adminRemark}`, MARGIN, y, {
            width: COL_R - MARGIN - 100,
          });
        y += 11;
      }

      // Status badge aligned to the top-right of this entry's block
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(statusColor)
        .text(r.returnRequestStatus.toUpperCase(), COL_R - 90, entryTop, {
          width: 90,
          align: "right",
        });

      y += 8;
      hr(y, "#f1f5f9");
      y += 10;
    });
  }

  // Footer
  const pageH = doc.page.height;
  doc.rect(0, pageH - 40, W, 40).fill(C.dark);
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#b7c4ff")
    .text(
      "© 2024 THE DIGITAL ATELIER  ·  All Rights Reserved  ·  www.digitalatelier.com",
      0,
      pageH - 24,
      { align: "center", width: W },
    );

  doc.end();
};

export const cancelRequestLogic = async (
  id,
  reason,
  remark,
  orderId,
  userId,
) => {
  try {
    if (!id || !orderId) {
      return { success: false, message: "Invalid request" };
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return { success: false, message: "Order not found" };
    }

    if (order.deliveryStatus !== "pending") {
      return { success: false, message: "Cannot cancel after shipping" };
    }

    // ensure array exists
    if (!order.cancelledAt) order.cancelledAt = [];

    //  full order cancell
    if (id === "ALL") {
      // take refund BEFORE modifying
      const refundAmount = order.totalAmount;

      //  restore stock
      for (const item of order.orderItems) {
        await variantModel.updateOne(
          { _id: item.variantId },
          { $inc: { stock: item.quantity } },
        );
        item.deliveryStatus = "cancelled";
      }

      //  update order
      order.subTotal = 0;
      order.shippingCharge = 0;
      order.taxAmount = 0;
      order.totalAmount = 0;
      order.orderStatus = "cancelled";
      order.deliveryStatus = "cancelled";
      order.expectedDeliveryDate = null;

      order.cancelledAt.push({
        reason: reason || "",
        remarks: remark || "",
        cancelledBy: "user",
        requestedAt: new Date(),
        cancelledProducts: order.orderItems.map((i) => i.variantId),
      });

      await order.save();

      if (["paypal", "wallet"].includes(order.orderMethod)) {
        const refundResult = await creditWallet(
          userId,
          refundAmount,
          `Refund for order #${order.orderCode || orderId}`,
          orderId,
        );

        if (!refundResult.success) {
          console.error("Refund failed for full order:", orderId);
        }
      }

      return { success: true, message: "Full order cancelled" };
    }

    // single item cancell

    const item = order.orderItems.find(
      (i) => i.variantId.toString() === id.toString(),
    );

    if (!item) {
      return { success: false, message: "Item not found" };
    }

    //  restore stock
    await variantModel.updateOne(
      { _id: item.variantId },
      { $inc: { stock: item.quantity } },
    );
    item.deliveryStatus = "cancelled";

    order.cancelledAt.push({
      reason: reason || "",
      remarks: remark || "",
      cancelledBy: "user",
      requestedAt: new Date(),
      cancelledProducts: [item.variantId],
    });

    //  get all cancelled product IDs
    const cancelledIds = new Set(
      order.cancelledAt.flatMap((c) =>
        c.cancelledProducts.map((id) => id.toString()),
      ),
    );

    //  remaining items
    const activeItems = order.orderItems.filter(
      (i) => !cancelledIds.has(i.variantId.toString()),
    );

    //  recalculate subtotal
    const subTotal = activeItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );

    order.subTotal = subTotal;

    // shipping logic
    order.shippingCharge = subTotal === 0 ? 0 : subTotal >= 999 ? 0 : 99;
    order.totalAmount = subTotal + order.shippingCharge;

    if (activeItems.length === 0) {
      order.orderStatus = "cancelled";
      order.deliveryStatus = "cancelled";
      order.expectedDeliveryDate = null;
    }

    await order.save();

    if (["paypal", "wallet"].includes(order.orderMethod)) {
      const refundAmount = item.price * item.quantity;

      const refundResult = await creditWallet(
        userId,
        refundAmount,
        `Refund for item in order #${order.orderCode || orderId}`,
        orderId,
      );

      if (!refundResult.success) {
        console.error("Refund failed for item:", item.variantId);
      }
    }

    return { success: true, message: "Item cancelled" };
  } catch (error) {
    console.error("cancelRequestLogic error:", error);
    return { success: false, message: "Something went wrong" };
  }
};

export const returnRequestLogic = async (
  userId,
  orderId,
  reason,
  remark,
  resolution,
  variantId,
  quantity,
) => {
  try {
    //  Validation
    if (!orderId || !variantId) {
      return { success: false, message: "Order ID and item required" };
    }

    if (!reason?.trim()) {
      return { success: false, message: "Reason is required" };
    }

    //  Get order
    const order = await orderModel.findOne({ _id: orderId, userId });
    if (!order) {
      return { success: false, message: "Order not found" };
    }

    if (order.deliveryStatus !== "delivered") {
      return { success: false, message: "Return allowed only after delivery" };
    }

    order.returnedAt = order.returnedAt || [];

    //  Get cancelled IDs
    const cancelledIds = new Set(
      (order.cancelledAt || []).flatMap((c) =>
        c.cancelledProducts.map((id) => id.toString()),
      ),
    );

    // return all
    if (variantId === "ALL") {
      const eligibleItems = order.orderItems.filter((item) => {
        const vid = item.variantId.toString();
        if (cancelledIds.has(vid)) return false;

        const activeReturnedQty = order.returnedAt
          .filter(
            (r) =>
              r.variant.toString() === vid &&
              r.returnRequestStatus !== "Rejected",
          )
          .reduce((sum, r) => sum + (r.quantity || 1), 0);

        return item.quantity > activeReturnedQty;
      });

      if (eligibleItems.length === 0) {
        return { success: false, message: "No items available to return" };
      }

      eligibleItems.forEach((item) => {
        const vid = item.variantId.toString();
        const activeReturnedQty = order.returnedAt
          .filter(
            (r) =>
              r.variant.toString() === vid &&
              r.returnRequestStatus !== "Rejected",
          )
          .reduce((sum, r) => sum + (r.quantity || 1), 0);

        const remainingQty = item.quantity - activeReturnedQty;

        order.returnedAt.push({
          reason: reason.trim(),
          remark: remark || "",
          resolution: resolution || "",
          variant: item.variantId,
          quantity: remainingQty,
          requestedAt: new Date(),
          returnRequestStatus: "Pending",
        });
      });

      await order.save();
      return { success: true, message: "Return requested for all items" };
    }

    //  single item
    if (cancelledIds.has(variantId.toString())) {
      return { success: false, message: "Item already cancelled" };
    }

    const item = order.orderItems.find(
      (i) => i.variantId.toString() === variantId,
    );

    if (!item) {
      return { success: false, message: "Item not found" };
    }

    // Calculate how much of this item has already been successfully/pending returned
    const activeReturnedQty = order.returnedAt
      .filter(
        (r) =>
          r.variant.toString() === variantId.toString() &&
          r.returnRequestStatus !== "Rejected",
      )
      .reduce((sum, r) => sum + (r.quantity || 1), 0);

    const maxReturnableQty = item.quantity - activeReturnedQty;

    if (maxReturnableQty <= 0) {
      return { success: false, message: "Already returned" };
    }

    const qty = parseInt(quantity) || 1;
    if (qty < 1 || qty > maxReturnableQty) {
      return {
        success: false,
        message: `Quantity must be between 1 and ${maxReturnableQty}`,
      };
    }

    order.returnedAt.push({
      reason: reason.trim(),
      remark: remark || "",
      resolution: resolution || "",
      variant: variantId,
      quantity: qty,
      requestedAt: new Date(),
      returnRequestStatus: "Pending",
    });

    await order.save();

    return { success: true, message: "Return request submitted" };
  } catch (error) {
    console.error("returnRequestLogic error:", error);
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
