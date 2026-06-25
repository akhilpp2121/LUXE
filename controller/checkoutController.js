import { CartDataTake } from "../service/cartService.js";
import { placeOrderLogic ,applyCoupon,getAvailableCoupon} from "../service/checkoutService.js";
import { addressFetcher } from "../service/userProfileService.js";
import { walletBalanceCheck } from "../service/walletService.js";

export const checkoutPageLoad = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    let userId = req.session.user.id || req.session.user._id;
    const walletBalance = await walletBalanceCheck(userId);
    let cartDetails = await CartDataTake(userId);

    const activeCartitems = (cartDetails.data || []).filter(
      (item) =>
        item.variantId?.isActive === true &&
        item.variantId?.stock > 0 &&
        item.quantity <= item.variantId.stock
    );

    if (activeCartitems.length === 0) return res.redirect("/cart");

    const orderTotal = activeCartitems.reduce(
      (sum, item) => sum + item.variantId.price * item.quantity, 0
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
      cart: [], address: [], defaultAddress: null,
      walletBalance: 0, availableCoupons: [], orderTotal: 0,
    });
  }
};

export const applyCouponController = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code || !orderTotal)
      return res.status(400).json({ success: false, message: "Missing fields" });

    const result = await applyCoupon(code, Number(orderTotal));
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("applyCouponController error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const placeOrderController = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Session expired. Please login again." });

    const { addressId, paymentMethod, couponCode, discount } = req.body; // <-- couponCode & discount added

    if (!addressId || !paymentMethod)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    const result = await placeOrderLogic(userId, addressId, paymentMethod, couponCode, discount);

    if (!result.success)
      return res.status(400).json({ success: false, message: result.message });

    req.session.lastOrderCode = result.orderCode;
    return res.status(200).json({
      success: true,
      redirect: `/checkout/order-success/${result.orderCode}`,
    });
  } catch (error) {
    console.error("placeOrderController error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};



export const cancellPageLoad = async (req, res) => {
  try {
    // Render a dedicated cancel page informing the user the PayPal payment was cancelled.
    // The view can provide options to retry payment or continue shopping.
    return res.render("Users/paypalCancel", { user: req.session.user || null });
  } catch (error) {
    console.error("error in cancellPageLoad", error);
    // Fallback: redirect to checkout page if rendering fails.
    return res.redirect("/checkout");
  }
};