
import { addressModel } from "../model/addressModel.js";
import cartModel from "../model/cartModel.js";
import orderModel from "../model/orderModel.js";
import variantModel from "../model/variantModel.js";


export const placeOrderLogic = async (userId, addressId, paymentMethod) => {
  try {
    const address = await addressModel.findOne({ _id: addressId, userId });
    if (!address) {
      return { success: false, message: "Address not found" };
    }

    const cartdata = await cartModel.findOne({ userId }).populate({
      path: "items.variantId",
      populate: { path: "productId" }
    });

    if (!cartdata || cartdata.items.length === 0) {
      return { success: false, message: "Cart is empty" };
    }

    // Step 3: Build orderItems
    let subTotal = 0;
    let orderItems = [];

    for (const items of cartdata.items) {
      const variant = items.variantId;
      const product = variant?.productId;

      const isInvalid = !product?.isActive || !variant?.isActive || (variant?.stock ?? 0) < 1;
      if (isInvalid) continue;

      const hasDiscount = variant.discount && variant.discount < variant.price;
      const finalPrice  = hasDiscount ? variant.discount : variant.price;
      const finalQty    = items.quantity || 1;
      const totalPrice  = finalPrice * finalQty;

      subTotal += totalPrice;

      orderItems.push({
        variantId:   variant._id,
        productName: product.name,
        variantName: variant.name || `${variant.color || ''} ${variant.size || ''}`.trim(),
        price:       finalPrice,
        quantity:    finalQty,
        totalPrice:  totalPrice,
        stock:       variant.stock  
      });
    }

    if (orderItems.length === 0) {
      return { success: false, message: "No valid items in cart" };
    }

    for (const item of orderItems) {
      if (item.quantity > (item.stock ?? 0)) {
        return {
          success: false,
          message: `Only ${item.stock} units available for ${item.productName}`
        };
      }
    }

    const GST_RATE  = 0.05;
    const gstAmount = Math.round(subTotal * GST_RATE);
    const shipping  = subTotal >= 999 ? 0 : 99;
    const grandTotal = subTotal + gstAmount + shipping;

    const order = await orderModel.create({
      userId,
      shippingAddressId: address._id,
      shippingAddress: {
        username:       address.fullName,
        phone_number:   address.phoneNumber,
        street_address: `${address.houseNumber}, ${address.streetName}`,
        landmark:       address.landmark || "",
        city:           address.city,
        state:          address.state,
        postal_code:    address.pincode,
        country:        address.country
      },
      orderItems,
      subTotal,
      gstRate:       GST_RATE * 100,
      gstAmount:     gstAmount,
      shippingCharge: shipping,
      totalAmount:   grandTotal,
      orderMethod:   paymentMethod?.toLowerCase().trim()
    });

    for (const item of orderItems) {
      await variantModel.findByIdAndUpdate(
        item.variantId,
        { $inc: { stock: -item.quantity } }
      );
    }

    await cartModel.findOneAndUpdate({ userId }, { $set: { items: [] } });

    return {
      success:   true,
      orderId:   order._id,
      orderCode: order.orderCode,
      message:   "Order placed successfully"
    };

  } catch (error) {
    console.error("placeOrderLogic error:", error);
    return { success: false, message: error.message || "Something went wrong" };
  }
};
