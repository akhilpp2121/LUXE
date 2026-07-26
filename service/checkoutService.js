import { addressModel } from "../model/addressModel.js";
import cartModel from "../model/cartModel.js";
import orderModel from "../model/orderModel.js";
import variantModel from "../model/variantModel.js";
import mongoose from "mongoose";
import { userModel } from "../model/usermodel.js";
import couponModel from "../model/couponModel.js";
import { debitWallet } from "./walletService.js";


const validateCartStock = (cartItems) => {
  const issues = [];
  const validItems = [];

  for (const item of cartItems) {
    const variant = item.variantId;
    const product = variant?.productId;
    const qty = item.quantity || 1;

    if (!product) {
      issues.push("An item in your cart is no longer available");
      continue;
    }

    if (!product.isActive || !variant?.isActive) {
      issues.push(`${product.name} is no longer available`);
      continue;
    }

    const stock = variant.stock ?? 0;

    if (stock < 1) {
      issues.push(`${product.name} is out of stock`);
      continue;
    }

    if (qty > stock) {
      issues.push(
        `Only ${stock} unit(s) left for ${product.name} (you requested ${qty})`,
      );
      continue;
    }

    validItems.push(item);
  }

  return { issues, validItems };
};

export const placeOrderLogic = async (
  userId,
  addressId,
  paymentMethod,
  couponCode = null,
  discount = 0,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Address check
    const address = await addressModel.findOne({ _id: addressId, userId });
    if (!address) throw new Error("Address not found");

    // 2. Cart
    const cartdata = await cartModel.findOne({ userId }).populate({
      path: "items.variantId",
      populate: { path: "productId" },
    });

    if (!cartdata || cartdata.items.length === 0)
      throw new Error("Cart is empty");


    const { issues, validItems } = validateCartStock(cartdata.items);
    if (issues.length > 0) {
      throw new Error(issues.join("; "));
    }

    // 4. Build order items
    let subTotal = 0;
    let orderItems = [];

    for (const items of validItems) {
      const variant = items.variantId;
      const product = variant.productId;

      const finalPrice =
        variant.discount && variant.discount < variant.price
          ? variant.discount
          : variant.price;

      const qty = items.quantity || 1;
      const totalPrice = finalPrice * qty;
      subTotal += totalPrice;

      orderItems.push({
        variantId: variant._id,
        productName: product.name,
        variantName:
          variant.name ||
          `${variant.color || ""} ${variant.size || ""}`.trim() ||
          "Default Variant",
        price: finalPrice,
        quantity: qty,
        totalPrice,
      });
    }

    if (!orderItems.length) throw new Error("No valid items in cart");

    // 5. Pricing
    const GST_RATE = 0.05;
    const shipping = subTotal >= 999 ? 0 : 99;

    // ── Validate and apply coupon discount ──
    let appliedDiscount = 0;
    if (couponCode && discount > 0) {
      const couponResult = await applyCoupon(couponCode, subTotal);
      if (couponResult.success) {
        appliedDiscount = Math.min(couponResult.discount, subTotal);


        await couponModel.updateOne(
          { code: couponCode.toUpperCase().trim() },
          { $inc: { usageLimit: -1 } },
          { session },
        );
      }
    }

    const taxableValue = Math.max(subTotal - appliedDiscount, 0);
    const gstAmount = Math.round(taxableValue * GST_RATE);

    const grandTotal = taxableValue + gstAmount + shipping;

    // 6. Wallet pre-check (use final grandTotal after coupon)
    if (paymentMethod === "wallet") {
      const user = await userModel.findById(userId);
      if (!user || user.wallet < grandTotal)
        throw new Error("Insufficient wallet balance");
    }

    // 7. Create order — couponApplied now saved correctly
    const [order] = await orderModel.create(
      [
        {
          userId,
          shippingAddressId: address._id,
          shippingAddress: {
            username: address.fullName,
            phone_number: address.phoneNumber,
            street_address: `${address.houseNumber}, ${address.streetName}`,
            city: address.city,
            state: address.state,
            postal_code: address.pincode,
            country: address.country,
          },
          orderItems,
          subTotal,
          gstAmount,
          shippingCharge: shipping,
          couponApplied: appliedDiscount, // ← was missing entirely before
          totalAmount: grandTotal,
          orderMethod: paymentMethod,
        },
      ],
      { session },
    );


    for (const item of orderItems) {
      const updated = await variantModel.updateOne(
        { _id: item.variantId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session },
      );
      if (updated.modifiedCount === 0)
        throw new Error("Stock changed, please try again");
    }

    // 9. Wallet debit
    if (paymentMethod === "wallet") {
      const debit = await debitWallet(
        userId,
        grandTotal,
        `Payment for order #${order.orderCode}`,
        order._id,
      );
      if (!debit.success) throw new Error("Wallet debit failed");
    }

    // 10. Clear cart
    await cartModel.updateOne({ userId }, { $set: { items: [] } }, { session });

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      orderId: order._id,
      orderCode: order.orderCode,
      message: "Order placed successfully",
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("placeOrderLogic error:", error);
    return { success: false, message: error.message || "Order failed" };
  }
};

export const getAvailableCoupon = async (orderTotal) => {
  try {
    const now = new Date();
    return await couponModel.find({
      isActive: true,
      expiryDate: { $gt: now },
      minOrderValue: { $lte: orderTotal },
      $expr: { $gt: ["$usageLimit", 0] },
    });
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const applyCoupon = async (code, orderTotal) => {
  const now = new Date();
  const coupon = await couponModel.findOne({
    code: code.toUpperCase().trim(),
    isActive: true,
    expiryDate: { $gt: now },
    $expr: { $gt: ["$usageLimit", 0] },
  });

  if (!coupon) return { success: false, message: "Invalid or expired coupon" };
  if (orderTotal < coupon.minOrderValue)
    return {
      success: false,
      message: `Minimum order value is ₹${coupon.minOrderValue}`,
    };

  let discount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    discount = (orderTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.min(discount, orderTotal);

  return {
    success: true,
    discount: Math.round(discount),
    couponCode: coupon.code,
    message: `Coupon applied! You save ₹${Math.round(discount)}`,
  };
};

/* ══════════════════════════════════════════════════
   PAYPAL RETRY-SUPPORT FUNCTIONS
   (used by utilites/paypal.js — createOrder/captureOrder/retryCreateOrder)
══════════════════════════════════════════════════ */

// Creates the order + reserves stock, but does NOT clear the cart and
// does NOT assume payment succeeded. Used for PayPal, where payment
// confirmation happens in a separate step (captureOrder).
export const createPendingPaypalOrder = async (
  userId,
  addressId,
  couponCode = null,
  discount = 0,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const address = await addressModel.findOne({ _id: addressId, userId });
    if (!address) throw new Error("Address not found");

    const cartdata = await cartModel.findOne({ userId }).populate({
      path: "items.variantId",
      populate: { path: "productId" },
    });

    if (!cartdata || cartdata.items.length === 0)
      throw new Error("Cart is empty");

    const { issues, validItems } = validateCartStock(cartdata.items);
    if (issues.length > 0) throw new Error(issues.join("; "));

    let subTotal = 0;
    let orderItems = [];

    for (const item of validItems) {
      const variant = item.variantId;
      const product = variant.productId;
      const finalPrice =
        variant.discount && variant.discount < variant.price
          ? variant.discount
          : variant.price;
      const qty = item.quantity || 1;
      const totalPrice = finalPrice * qty;
      subTotal += totalPrice;

      orderItems.push({
        variantId: variant._id,
        productName: product.name,
        variantName:
          variant.name ||
          `${variant.color || ""} ${variant.size || ""}`.trim() ||
          "Default Variant",
        price: finalPrice,
        quantity: qty,
        totalPrice,
      });
    }

    if (!orderItems.length) throw new Error("No valid items in cart");

    const GST_RATE = 0.05;
    const shipping = subTotal >= 999 ? 0 : 99;

    let appliedDiscount = 0;
    if (couponCode && discount > 0) {
      const couponResult = await applyCoupon(couponCode, subTotal);
      if (couponResult.success) {
        appliedDiscount = Math.min(couponResult.discount, subTotal);
        await couponModel.updateOne(
          { code: couponCode.toUpperCase().trim() },
          { $inc: { usageLimit: -1 } },
          { session },
        );
      }
    }

    const taxableValue = Math.max(subTotal - appliedDiscount, 0);
    const gstAmount = Math.round(taxableValue * GST_RATE);
    const grandTotal = taxableValue + gstAmount + shipping;

    const [order] = await orderModel.create(
      [
        {
          userId,
          shippingAddressId: address._id,
          shippingAddress: {
            username: address.fullName,
            phone_number: address.phoneNumber,
            street_address: `${address.houseNumber}, ${address.streetName}`,
            city: address.city,
            state: address.state,
            postal_code: address.pincode,
            country: address.country,
          },
          orderItems,
          subTotal,
          gstAmount,
          shippingCharge: shipping,
          couponApplied: appliedDiscount,
          totalAmount: grandTotal,
          orderMethod: "paypal",
          orderStatus: "payment_pending", // ← key difference
        },
      ],
      { session },
    );

    // reserve stock immediately so it can't be double-sold while paying
    for (const item of orderItems) {
      const updated = await variantModel.updateOne(
        { _id: item.variantId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session },
      );
      if (updated.modifiedCount === 0)
        throw new Error("Stock changed, please try again");
    }

    // NOTE: cart is intentionally NOT cleared here — only after capture succeeds.

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      orderId: order._id,
      orderCode: order.orderCode,
      totalAmount: grandTotal,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("createPendingPaypalOrder error:", error);
    return { success: false, message: error.message || "Order failed" };
  }
};

// Call after a successful PayPal capture
export const markOrderPaid = async (orderId, paypalCaptureId) => {
  return orderModel.findByIdAndUpdate(orderId, {
    orderStatus: "placed",
    "paymentDetails.paypalCaptureId": paypalCaptureId,
  });
};

// Call after a failed PayPal capture (or a thrown error during capture)
export const markOrderPaymentFailed = async (orderId, errorMessage) => {
  return orderModel.findByIdAndUpdate(orderId, {
    orderStatus: "payment_failed",
    $inc: { "paymentDetails.retryCount": 1 },
    "paymentDetails.lastError": errorMessage || "Payment failed",
  });
};

export const getRetryableOrder = async (userId, orderCode) => {
  const order = await orderModel.findOne({ orderCode, userId });
  if (!order) return { success: false, message: "Order not found" };
  if (!["payment_failed", "payment_pending"].includes(order.orderStatus))
    return { success: false, message: "This order is not eligible for retry" };
  return { success: true, order };
};