import wishlistModel from "../model/wishlistModel.js";
import cartModel from "../model/cartModel.js";
import variantModel from "../model/variantModel.js";
import { variantDataLoad } from "./productsService.js";
import { findUserBlocked } from "./userService.js";

export const wishlistCheck = async (userId) => {
  try {
    const wishlist = await wishlistModel.find({ userId });
    const wishlistedIds = wishlist.map((w) => w.variantId.toString());
    return { success: true, data: wishlistedIds };
  } catch (error) {
    console.error("wishlistCheck error:", error);
    return { success: false, data: [] };
  }
};
export const wishlistData = async ({ userId, skip, limit }) => {
  try {
    const totalDocs = await wishlistModel.countDocuments({ userId });
    const totalPage = Math.ceil(totalDocs / limit) || 1;

    const data = await wishlistModel
      .find({ userId })
      .populate({
        path: "variantId",
        populate: {
          path: "productId",
          populate: { path: "categoryId" },
        },
      })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      success: true,
      data: data ?? [],
      totalPage,
    };
  } catch (error) {
    console.error("wishlistData error:", error);
    return { success: false, message: "Server error", data: [], totalPage: 1 };
  }
};

export const wishListUpdateLogic = async (variantId, action, userId) => {
  try {
    if (!variantId || !action || !userId) {
      return { success: false, message: "Missing required fields" };
    }

    const userIsBlocked = await findUserBlocked(userId);
    if (userIsBlocked) {
      return { success: false, message: "user is blocked" };
    }

    if (action === "ADD") {
      const existsInWishlist = await wishlistModel.findOne({
        userId,
        variantId,
      });
      if (existsInWishlist) {
        return { success: false, message: "Already in your wishlist" };
      }
      const cartAddedProduct = await cartModel.findOne({ userId, variantId });
      if (cartAddedProduct) {
        return { success: false, message: "product already in cart " };
      }

      try {
        await wishlistModel.create({ userId, variantId });
      } catch (err) {
        if (err.code === 11000) {
          return { success: false, message: "Already in your wishlist" };
        }
        throw err;
      }
      return { success: true, message: "Added to wishlist" };
    }

    if (action === "REMOVE") {
      await wishlistModel.deleteOne({ userId, variantId });
      return { success: true, message: "Removed from wishlist" };
    }

    return { success: false, message: "Invalid action" };
  } catch (error) {
    console.error("Wishlist error:", error);
    return { success: false, message: "Server error" };
  }
};

export const moveToCartLogic = async (variantId, wishlistId, userId) => {
  try {
    const variant = await variantModel.findById(variantId);

    if (!variant) {
      return { success: false, message: "Product not found" };
    }

    if (!variant.isActive || variant.stock <= 0) {
      return { success: false, message: "Item is out of stock" };
    }

    const existsInCart = await cartModel.findOne({ userId, variantId });

    if (existsInCart) {
      await wishlistModel.findByIdAndDelete(wishlistId);
      return {
        success: true,
        message: "Already in cart, removed from wishlist",
      };
    }

    const [cartItem, deletedWishlist] = await Promise.all([
      cartModel.create({ userId, variantId, quantity: 1 }),
      wishlistModel.findByIdAndDelete(wishlistId),
    ]);

    return { success: true, message: "Moved to bag successfully" };
  } catch (error) {
    console.error("moveToCartLogic error:", error);
    return { success: false, message: "Server error" };
  }
};

export const removeWishlistItemLogic = async (wishlistId, userId) => {
  try {
    const item = await wishlistModel.findOneAndDelete({
      _id: wishlistId,
      userId,
    });

    if (!item) {
      return { success: false, message: "Item not found in wishlist" };
    }

    return { success: true, message: "Removed from wishlist" };
  } catch (error) {
    console.error("removeWishlistItemLogic error:", error);
    return { success: false, message: "Server error" };
  }
};
