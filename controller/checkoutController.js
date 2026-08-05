import { CartDataTake } from "../service/cartService.js";
import {
  placeOrderLogic,
  applyCoupon,
  getAvailableCoupon,
} from "../service/checkoutService.js";
import { addressFetcher } from "../service/userProfileService.js";
import { walletBalanceCheck } from "../service/walletService.js";

// export const checkoutPageLoad = async (req, res) => {
//   try {
//     if (!req.session.user) return res.redirect("/login");

//     let userId = req.session.user.id || req.session.user._id;

//     const walletBalance = await walletBalanceCheck(userId);
//     let cartDetails = await CartDataTake(userId);

//     const activeCartitems = (cartDetails.data || []).filter(
//       (item) =>
//         item.variantId?.isActive === true &&
//         item.variantId?.stock > 0 &&
//         item.quantity <= item.variantId.stock,
//     );

//     if (activeCartitems.length === 0) return res.redirect("/cart");

//     const orderTotal = activeCartitems.reduce(
//       (sum, item) => sum + item.variantId.price * item.quantity,
//       0,
//     );

//     let address = [];
//     let defaultAddress = null;
//     try {
//       address = await addressFetcher(userId);
//       defaultAddress = address.find((a) => a.isDefault) || address[0] || null;
//     } catch (err) {}

//     const availableCoupons = await getAvailableCoupon(orderTotal);

//     return res.render("Users/checkout", {
//       cart: activeCartitems,
//       address,
//       defaultAddress,
//       id: userId,
//       walletBalance,
//       availableCoupons,
//       orderTotal,
//     });
//   } catch (error) {
//     console.log("error loading checkout", error);
//     return res.render("Users/checkout", {
//       cart: [],
//       address: [],
//       defaultAddress: null,
//       walletBalance: 0,
//       availableCoupons: [],
//       orderTotal: 0,
//     });
//   }
// };

export const checkoutPageLoad = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    let userId = req.session.user.id || req.session.user._id;

    const walletBalance = await walletBalanceCheck(userId);
    let cartDetails = await CartDataTake(userId);

    const allCartItems = cartDetails.data || [];

    // ── Split cart into valid (orderable) items and removed items ──
    // Instead of silently filtering out invalid items, we now track
    // *why* each item was excluded so the user can be informed on the page.
    const activeCartitems = [];
    const removedItems = [];

    for (const item of allCartItems) {
      const v = item.variantId;

      const isActive = v?.isActive === true && v?.productId?.isActive === true && v?.productId?.categoryId?.isActive === true;
      const hasStock = (v?.stock ?? 0) > 0;
      const qtyOk = hasStock && item.quantity <= v.stock;

      if (isActive && hasStock && qtyOk) {
        activeCartitems.push(item);
        continue;
      }

      // Determine the specific reason so the message is accurate
      let reason = "no longer available";
      if (isActive && !hasStock) {
        reason = "out of stock";
      } else if (isActive && hasStock && !qtyOk) {
        reason = `only ${v.stock} left (you have ${item.quantity} in cart)`;
      }

      removedItems.push({
        variantId: v?._id || null,
        name: v?.productId?.name || "Item",
        reason,
      });
    }

    if (activeCartitems.length === 0) {
      // Nothing left to check out — send the user back to their cart.
      // Optionally flash a message explaining why, if your session supports it.
      req.session.message =
        removedItems.length > 0
          ? "All items in your cart are currently unavailable. Please review your cart."
          : "Your cart is empty.";
      return res.redirect("/cart");
    }

    const orderTotal = activeCartitems.reduce(
      (sum, item) => sum + item.variantId.price * item.quantity,
      0,
    );

    let address = [];
    let defaultAddress = null;
    try {
      address = await addressFetcher(userId);
      defaultAddress = address.find((a) => a.isDefault) || address[0] || null;
    } catch (err) {}

    const availableCoupons = await getAvailableCoupon(orderTotal);

    return res.render("Users/checkout", {
      cart: activeCartitems,
      removedItems, // ← new: template can render a warning banner from this
      address,
      defaultAddress,
      id: userId,
      walletBalance,
      availableCoupons,
      orderTotal,
    });
  } catch (error) {
    console.log("error loading checkout", error);
    return res.render("Users/checkout", {
      cart: [],
      removedItems: [],
      address: [],
      defaultAddress: null,
      walletBalance: 0,
      availableCoupons: [],
      orderTotal: 0,
    });
  }
};

export const applyCouponController = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code || !orderTotal)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });

    const result = await applyCoupon(code, Number(orderTotal));
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("applyCouponController error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

export const placeOrderController = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;
    if (!userId)
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });

    const { addressId, paymentMethod, couponCode, discount } = req.body;

    if (!addressId || !paymentMethod)
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });

    const result = await placeOrderLogic(
      userId,
      addressId,
      paymentMethod,
      couponCode,
      discount,
    );

    if (!result.success)
      return res.status(400).json({ success: false, message: result.message });

    req.session.lastOrderCode = result.orderCode;
    return res.status(200).json({
      success: true,
      redirect: `/checkout/order-success/${result.orderCode}`,
    });
  } catch (error) {
    console.error("placeOrderController error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

export const cancellPageLoad = async (req, res) => {
  try {
    return res.render("Users/paypalCancel", { user: req.session.user || null });
  } catch (error) {
    console.error("error in cancellPageLoad", error);

    return res.redirect("/checkout");
  }
};
