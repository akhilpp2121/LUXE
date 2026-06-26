import {
  wishlistData,
  wishListUpdateLogic,
  moveToCartLogic,
  removeWishlistItemLogic,
} from "../service/wishlistServie.js";
import { findUserByEmail } from "../service/userService.js";
import { getCartCount } from "../service/cartService.js";
import { findUserBlocked } from "../service/userService.js";



export const wishlistPageLoad = async (req, res) => {
    try {

   const isBlockedUser = await findUserBlocked(userId);
      if (isBlockedUser) {
        req.session.user = null;
        req.session.flashMessage = { type: "error", message: "Your account has been blocked." };
        return res.redirect("/login");
      }
  




        if (!req.session?.user) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id || req.session.user._id;
        const limit = 4;

        const result = await wishlistData({ userId, skip: 0, limit });

        const totalPage = result.totalPage ?? 1;
        const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), totalPage);
        const skip = (page - 1) * limit;

        const finalResult = page > 1
            ? await wishlistData({ userId, skip, limit })
            : result;

        const cart = await getCartCount(userId);

        return res.render("Users/wishlist", {
            wishlist:    finalResult.data ?? [],
            cart,
            isLogged:    req.session.user,
            query:       req.query,
            totalPage,
            currentPage: page,
        });

    } catch (error) {
        console.error("Wishlist page error:", error);
        return res.status(500).send("Something went wrong");
    }
};

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
