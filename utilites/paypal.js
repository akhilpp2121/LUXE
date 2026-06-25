import checkoutNodeJssdk from "@paypal/checkout-server-sdk";
import paypalClient from "../config/paypal.js";
import cartModel from "../model/cartModel.js";
import paymentModel from "../model/paymentModel.js";
/* ── helper ── */
const calculateOrderTotal = async (userId) => {
  try {
    const cart = await cartModel.findOne({ userId }).populate({
      path: "items.variantId",
      populate: { path: "productId" }
    });

    if (!cart || cart.items.length === 0) {
      return { success: false, totalAmount: 0 };
    }

    let totalAmount = 0;

    for (const item of cart.items) {
      const variant = item.variantId;

      // skip invalid / inactive items
      if (!variant || !variant.isActive || !variant?.productId?.isActive || variant.stock < 1) {
        continue;
      }

      const price = variant.discount && variant.discount < variant.price
        ? variant.discount
        : variant.price;

      const gst      = Math.round(price * 0.05);
      const quantity = item.quantity || 1;

      totalAmount += (price + gst) * quantity;
    }

    // add shipping if below free threshold
    if (totalAmount < 999) totalAmount += 99;

    if (totalAmount <= 0) return { success: false, totalAmount: 0 };

    return { success: true, totalAmount };

  } catch (e) {
    console.error("calculateOrderTotal error:", e);
    return { success: false, totalAmount: 0 };
  }
};

/* ── controllers ── */
export const createOrder = async (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user._id;
    const total  = await calculateOrderTotal(userId);

    if (!total.success) {
      return res.status(400).json({ message: "Cart is empty or invalid" });
    }

    const usdAmount = Math.round((total.totalAmount / 90.72) * 100) / 100;

    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    req.session.paypalTotal = usdAmount;

    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: "USD",
          value: usdAmount.toString()
        }
      }]
    });

    const order = await paypalClient.execute(request);
    return res.json({ id: order.result.id });

  } catch (e) {
    console.error("Create order Error:", e);
    return res.status(500).json({ message: "Payment failed" });
  }
};

export const captureOrder = async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const capture = await paypalClient.execute(request);
    const result  = capture.result;
    const status  = result.status;

    if (status !== "COMPLETED") {
      return res.json({ success: false, message: "Payment not completed" });
    }

    const paymentDetails = result.purchase_units[0].payments.captures[0];
    const userId         = req.session.user.id || req.session.user._id;
    const email          = req.session.user.email;


    const newOrder = new paymentModel({   
  userId,
  paypalOrderId:   orderID,
  paypalCaptureId: paymentDetails.id,
  amount:          paymentDetails.amount.value,
  currency:        paymentDetails.amount.currency_code,
  paymentStatus:   status,
  payerEmail:      email,
  payerName:       result.payer.name.given_name
});


    
    await newOrder.save();

    return res.json({ success: true, status: "COMPLETED" });

  } catch (error) {
    console.error("Capture Error:", error);
    return res.status(500).json({ message: "Payment failed" });
  }
};