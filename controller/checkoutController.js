import { CartDataTake } from "../service/cartService.js";
import { placeOrderLogic } from "../service/checkoutService.js";

import { addressFetcher,addressIdFetcher } from "../service/userProfileService.js";




export const checkoutPageLoad = async (req, res) => {
    try {
        if (!req.session.user) {
            console.log("No session user");
            return res.redirect("/login");
        }

        let userId = req.session.user.id || req.session.user._id;

        

        let cartDetails = await CartDataTake( userId );


        const activeCartitems = (cartDetails.data || []).filter(
            (item) =>
                item.variantId &&
                item.variantId.isActive === true &&
                item.variantId.stock > 0 &&
                item.quantity <= item.variantId.stock
        );

        let address = [];
        let defaultAddress = null;

        try {
            address = await addressFetcher(userId);
            defaultAddress = address.find((addr) => addr.isDefault) || address[0] || null; 
        } catch (err) {
            console.log("address error", err);
        }

        if (activeCartitems.length === 0) {
            console.log("Cart empty");
            return res.redirect("/cart");
        }

        return res.render("Users/checkout", {
            cart: activeCartitems,
            address: address,
            defaultAddress: defaultAddress, 
            id: userId
        });

    } catch (error) {
        console.log("error loading checkout", error);
        return res.render("Users/checkout", { cart: [], address: [], defaultAddress: null });
    }
};


export const placeOrderController = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;

   if (!userId) {
  return res.status(401).json({
    success: false,
    message: "Session expired. Please login again."
  });
}
    const { addressId, paymentMethod } = req.body;

    if (!addressId || !paymentMethod) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const result = await placeOrderLogic(userId, addressId, paymentMethod);
    
    

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    // Store in session  then redirect
    req.session.lastOrderCode = result.orderCode;
    return res.status(200).json({ 
      success: true, 
      redirect: `/checkout/order-success/${result.orderCode}` 
    });

  } catch (error) {
    console.error("placeOrderController error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};


