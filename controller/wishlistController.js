import {
  wishlistData,
  wishListUpdateLogic,
  moveToCartLogic,
  removeWishlistItemLogic,
} from "../service/wishlistServie.js";
import { findUserByEmail } from "../service/userService.js";
import { getCartCount } from "../service/cartService.js";

export const wishlistPageLoad = async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id || req.session.user._id;

        const result = await wishlistData({ userId });
        const cart   = await getCartCount(userId);

        const wishlist = result.success ? result.data : [];

        return res.render("Users/wishlist", {
            wishlist,
            cart,
            isLogged: req.session.user,
                        query: req.query
        });

    } catch (error) {
        console.error("Wishlist page error:", error);
        return res.status(500).send("Something went wrong");
    }
};

// export const wishlistPageLoad = async (req, res) => {
//   try {
//     if (!req.session?.user) {
//       return res.redirect("/login");
//     }

//     const userId = req.session.user.id || req.session.user._id;

//     const result = await wishlistData({ userId });
//     const cart = await getCartCount(userId);

//     const wishlist = result.success ? result.data : [];
//     const unavailable = result.success ? result.unavailable : []; 
//     return res.render("Users/wishlist", {
//       wishlist,
//       unavailable,
//       cart,
//       isLogged: req.session.user,
//       query: req.query,
//     });
//   } catch (error) {
//     console.error("Wishlist page error:", error);
//     return res.status(500).send("Something went wrong");
//   }
// };

export const updateWishlist = async (req, res) => {
  try {
    const { variantId, action } = req.body;
    const userId = req.session?.user._id || req.session?.user.id;

    if (!variantId || !action) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const progress = await wishListUpdateLogic(variantId, action, userId);

    if (!progress.success) {
      return res
        .status(400)
        .json({ success: false, message: progress.message });
    }

    return res.status(200).json({ success: true, message: progress.message });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const moveToCart = async (req, res) => {
  try {
    const { variantId, wishlistId } = req.body;
    const userId = req.session?.user?._id || req.session?.user?.id;

    if (!variantId || !wishlistId) {
      return res.redirect("/wishlist?error=Missing+fields");
    }

    const result = await moveToCartLogic(variantId, wishlistId, userId);

    if (!result.success) {
      return res.redirect(
        "/wishlist?error=" + encodeURIComponent(result.message),
      );
    }

    return res.redirect("/wishlist?success=Moved+to+bag+successfully");
  } catch (error) {
    console.error("moveToCart error:", error);
    return res.redirect("/wishlist?error=Something+went+wrong");
  }
};

export const removeWishlistItem = async (req, res) => {
  try {
    const { id } = req.body;
    const userId = req.session?.user?._id || req.session?.user?.id;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing wishlist item id" });
    }

    const result = await removeWishlistItemLogic(id, userId);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("removeWishlistItem error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
