import mongoose from "mongoose";

import cartModel from "../model/cartModel.js";
import variantModel from "../model/variantModel.js";

export const CartDataTake = async (userId) => {
  try {
    const cart = await cartModel.findOne({ userId }).populate({
      path: "items.variantId",
      populate: {
        path: "productId",
        populate: { path: "categoryId" },
      },
    });

    if (!cart || cart.items.length === 0) {
      return { success: false, message: "Cart is empty" };
    }

    let modified = false;
    const remainingItems = [];

    for (let item of cart.items) {
      if (!item.variantId) {
        modified = true; // variant deleted, drop it
        continue;
      }

      const stock = item.variantId.stock ?? 0;

      if (stock < 1) {
        // out of stock → remove item entirely, don't set quantity to 0
        modified = true;
        continue;
      }

      if (item.quantity > stock) {
        item.quantity = stock;
        modified = true;
      }

      remainingItems.push(item);
    }

    if (modified) {
      cart.items = remainingItems;
      await cart.save();
    }

    return { success: true, data: cart.items };
  } catch (error) {
    console.error("Cart load error:", error);
    return {
      success: false,
      message: "Something went wrong while loading cart",
    };
  }
};
// ── Add to cart ──
export const addToCart = async (variantId, userId, quantity) => {
  try {
    if (!variantId || !userId) {
      return { success: false, message: "Invalid request" };
    }

    const variant = await variantModel
      .findOne({
        _id: variantId,
        isActive: true,
        stock: { $gte: 1 },
      })
      .populate({
        path: "productId",
        populate: { path: "categoryId", match: { isActive: true } },
      });

    if (!variant || !variant.productId?.categoryId) {
      return {
        success: false,
        message: "Product might be blocked or out of stock",
      };
    }

    const qty = quantity || 1;
    if (qty > variant.stock) {
      return {
        success: false,
        message: `Only ${variant.stock} item(s) available in stock`,
      };
    }

    const alreadyInCart = await cartModel.findOne({
      userId,
      "items.variantId": variantId,
    });

    if (alreadyInCart) {
      return {
        success: false,
        message: "Product already in cart, go to cart!",
      };
    }

    await cartModel.findOneAndUpdate(
      { userId },
      { $push: { items: { variantId, quantity: qty } } },
      { upsert: true },
    );
    return { success: true, message: "Product added successfully" };
  } catch (error) {
    console.error("Cart add error:", error);
    return {
      success: false,
      message: "Something went wrong while adding to cart",
    };
  }
};

// ── Remove item ──
export const cartDelete = async (userId, variantId) => {
  try {
    if (!userId || !variantId) {
      return { success: false, message: "Invalid request" };
    }

    const result = await cartModel.findOneAndUpdate(
      { userId },
      { $pull: { items: { variantId } } },
      { returnDocument: "after" },
    );

    if (!result) {
      return { success: false, message: "Cart item not found" };
    }

    return { success: true, message: "Item removed from cart successfully" };
  } catch (error) {
    console.error("Cart delete error:", error);
    return {
      success: false,
      message: "Something went wrong while removing item",
    };
  }
};

export const cartEdit = async (userId, variantId, quantity) => {
  try {
    const variant = await variantModel.findById(variantId);
    if (!variant || !variant.isActive) {
      return { success: false, message: "Product not found" };
    }

    if (quantity < 1)
      return { success: false, message: "Quantity must be at least 1" };
    if (quantity > 10)
      return { success: false, message: "Cannot add more than 10" };
    if (quantity > variant.stock) {
      return {
        success: false,
        message: `Only ${variant.stock} items available`,
      };
    }

    await cartModel.findOneAndUpdate(
      { userId, "items.variantId": variantId },
      { $set: { "items.$.quantity": quantity } },
    );

    const unitPrice =
      variant.discount && variant.discount < variant.price
        ? variant.discount
        : variant.price;

    return { success: true, message: "Cart updated successfully", unitPrice };
  } catch (error) {
    console.error("Cart edit error:", error);
    return { success: false, message: "Server error" };
  }
};

export const getCartCount = async (userId) => {
  try {
    if (!userId) return 0;
    const cart = await cartModel.findOne({ userId });
    return cart?.items?.length ?? 0;
  } catch (error) {
    console.error("Cart count error:", error);
    return 0;
  }
};

export const clearCart = async (userId) => {
  try {
    await cartModel.findOneAndUpdate({ userId }, { $set: { items: [] } });
    return { success: true };
  } catch (error) {
    console.error("Cart clear error:", error);
    return { success: false };
  }
};
