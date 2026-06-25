
import { addressModel } from "../model/addressModel.js";
import cartModel from "../model/cartModel.js";
import orderModel from "../model/orderModel.js";
import variantModel from "../model/variantModel.js";
import mongoose from "mongoose";
import { userModel } from "../model/usermodel.js";
import couponModel from "../model/couponModel.js";
import { debitWallet } from "./walletService.js";

// export const placeOrderLogic = async (userId, addressId, paymentMethod) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     //  1. Address check
//     const address = await addressModel.findOne({ _id: addressId, userId });
//     if (!address) throw new Error("Address not found");

//     // 2. Cart
//     const cartdata = await cartModel.findOne({ userId }).populate({
//       path: "items.variantId",
//       populate: { path: "productId" }
//     });

//     if (!cartdata || cartdata.items.length === 0) {
//       throw new Error("Cart is empty");
//     }

//     //  3. Build order items
//     let subTotal = 0;
//     let orderItems = [];

//     for (const items of cartdata.items) {
//       const variant = items.variantId;
//       const product = variant?.productId;

//       const isInvalid =
//         !product?.isActive ||
//         !variant?.isActive ||
//         (variant?.stock ?? 0) < 1;

//       if (isInvalid) continue;

//       const finalPrice =
//         variant.discount && variant.discount < variant.price
//           ? variant.discount
//           : variant.price;

//       const qty = items.quantity || 1;

//       if (qty > variant.stock) {
//         throw new Error(`Only ${variant.stock} units available for ${product.name}`);
//       }

//       const totalPrice = finalPrice * qty;

//       subTotal += totalPrice;

//       orderItems.push({
//         variantId: variant._id,
//         productName: product.name,
//          variantName:
//   variant.name ||
//   `${variant.color || ""} ${variant.size || ""}`.trim() ||
//   "Default Variant",
//         price: finalPrice,
//         quantity: qty,
//         totalPrice
//       });
//     }

//     if (!orderItems.length) {
//       throw new Error("No valid items in cart");
//     }

//     //  . Pricing
//     const GST = 0.05;
//     const gstAmount = Math.round(subTotal * GST);
//     const shipping = subTotal >= 999 ? 0 : 99;
//     const grandTotal = subTotal + gstAmount + shipping;

//     //   Wallet pre-check
//     if (paymentMethod === "wallet") {
//       const user = await userModel.findById(userId);
//       if (!user || user.wallet < grandTotal) {
//         throw new Error("Insufficient wallet balance");
//       }
//     }

//     //   Create order
//     const [order] = await orderModel.create([{
//       userId,
//       shippingAddressId: address._id,
//       shippingAddress: {
//         username: address.fullName,
//         phone_number: address.phoneNumber,
//         street_address: `${address.houseNumber}, ${address.streetName}`,
//         city: address.city,
//         state: address.state,
//         postal_code: address.pincode,
//         country: address.country
//       },
//       orderItems,
//       subTotal,
//       gstAmount,
//       shippingCharge: shipping,
//       totalAmount: grandTotal,
//       orderMethod: paymentMethod
//     }], { session });

//     //   Safe stock update
//     for (const item of orderItems) {
//       const updated = await variantModel.updateOne(
//         { _id: item.variantId, stock: { $gte: item.quantity } },
//         { $inc: { stock: -item.quantity } },
//         { session }
//       );

//       if (updated.modifiedCount === 0) {
//         throw new Error("Stock changed, please try again");
//       }
//     }

//     //   Wallet debit
//     if (paymentMethod === "wallet") {
//       const debit = await debitWallet(
//         userId,
//         grandTotal,
//         `Payment for order #${order.orderCode}`,
//         order._id
//       );

//       if (!debit.success) {
//         throw new Error("Wallet debit failed");
//       }
//     }

//     //   Clear cart
//     await cartModel.updateOne(
//       { userId },
//       { $set: { items: [] } },
//       { session }
//     );

//     //  1 Commit
//     await session.commitTransaction();
//     session.endSession();

//     return {
//       success: true,
//       orderId: order._id,
//       orderCode: order.orderCode,
//       message: "Order placed successfully"
//     };

//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();

//     console.error("placeOrderLogic error:", error);
//     return {
//       success: false,
//       message: error.message || "Order failed"
//     };
//   }
// };


export const placeOrderLogic = async (userId, addressId, paymentMethod, couponCode = null, discount = 0) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Address check
    const address = await addressModel.findOne({ _id: addressId, userId });
    if (!address) throw new Error("Address not found");

    // 2. Cart
    const cartdata = await cartModel.findOne({ userId }).populate({
      path: "items.variantId",
      populate: { path: "productId" }
    });

    if (!cartdata || cartdata.items.length === 0)
      throw new Error("Cart is empty");

    // 3. Build order items
    let subTotal = 0;
    let orderItems = [];

    for (const items of cartdata.items) {
      const variant = items.variantId;
      const product = variant?.productId;

      const isInvalid =
        !product?.isActive || !variant?.isActive || (variant?.stock ?? 0) < 1;
      if (isInvalid) continue;

      const finalPrice =
        variant.discount && variant.discount < variant.price
          ? variant.discount
          : variant.price;

      const qty = items.quantity || 1;

      if (qty > variant.stock)
        throw new Error(`Only ${variant.stock} units available for ${product.name}`);

      const totalPrice = finalPrice * qty;
      subTotal += totalPrice;

      orderItems.push({
        variantId:   variant._id,
        productName: product.name,
        variantName:
          variant.name ||
          `${variant.color || ""} ${variant.size || ""}`.trim() ||
          "Default Variant",
        price:      finalPrice,
        quantity:   qty,
        totalPrice
      });
    }

    if (!orderItems.length) throw new Error("No valid items in cart");

    // 4. Pricing
    const GST       = 0.05;
    const gstAmount = Math.round(subTotal * GST);
    const shipping  = subTotal >= 999 ? 0 : 99;

    // ── FIX: validate and apply coupon discount ──
    let appliedDiscount = 0;
    if (couponCode && discount > 0) {
      // Re-validate the coupon server-side — never trust the client amount blindly
      const couponResult = await applyCoupon(couponCode, subTotal);
      if (couponResult.success) {
        // Use the server-calculated discount, not the client-sent value
        appliedDiscount = couponResult.discount;

        // Decrement usageLimit so the coupon can't be reused beyond its limit
        await couponModel.updateOne(
          { code: couponCode.toUpperCase().trim() },
          { $inc: { usageLimit: -1 } }
        );
      }
      // If coupon is invalid server-side we silently ignore it
      // (don't throw — just place order at full price)
    }

    const grandTotal = subTotal + gstAmount + shipping - appliedDiscount;

    // 5. Wallet pre-check (use final grandTotal after coupon)
    if (paymentMethod === "wallet") {
      const user = await userModel.findById(userId);
      if (!user || user.wallet < grandTotal)
        throw new Error("Insufficient wallet balance");
    }

    // 6. Create order — couponApplied now saved correctly
    const [order] = await orderModel.create([{
      userId,
      shippingAddressId: address._id,
      shippingAddress: {
        username:       address.fullName,
        phone_number:   address.phoneNumber,
        street_address: `${address.houseNumber}, ${address.streetName}`,
        city:           address.city,
        state:          address.state,
        postal_code:    address.pincode,
        country:        address.country
      },
      orderItems,
      subTotal,
      gstAmount,
      shippingCharge: shipping,
      couponApplied:  appliedDiscount,   // ← was missing entirely before
      totalAmount:    grandTotal,
      orderMethod:    paymentMethod
    }], { session });

    // 7. Stock update
    for (const item of orderItems) {
      const updated = await variantModel.updateOne(
        { _id: item.variantId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session }
      );
      if (updated.modifiedCount === 0)
        throw new Error("Stock changed, please try again");
    }

    // 8. Wallet debit
    if (paymentMethod === "wallet") {
      const debit = await debitWallet(
        userId,
        grandTotal,
        `Payment for order #${order.orderCode}`,
        order._id
      );
      if (!debit.success) throw new Error("Wallet debit failed");
    }

    // 9. Clear cart
    await cartModel.updateOne(
      { userId },
      { $set: { items: [] } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return {
      success:   true,
      orderId:   order._id,
      orderCode: order.orderCode,
      message:   "Order placed successfully"
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