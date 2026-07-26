import checkoutNodeJssdk from "@paypal/checkout-server-sdk";
import paypalClient from "../config/paypal.js";
import paymentModel from "../model/paymentModel.js";
import cartModel from "../model/cartModel.js";
import {
  createPendingPaypalOrder,
  markOrderPaid,
  markOrderPaymentFailed,
  getRetryableOrder,
} from "../service/checkoutService.js";
const USD_RATE = 90.72;

/* Creates the Order in DB THEN the matching PayPal order */
export const createOrder = async (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user._id;
    const { addressId, couponCode, discount } = req.body;

    if (!addressId) {
      return res.status(400).json({ message: "Address is required" });
    }

    const result = await createPendingPaypalOrder(
      userId,
      addressId,
      couponCode || null,
      discount || 0,
    );

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    const usdAmount = Math.round((result.totalAmount / USD_RATE) * 100) / 100;

    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [{
        amount: { currency_code: "USD", value: usdAmount.toString() },
      }],
    });

    const paypalOrder = await paypalClient.execute(request);

    // link the PayPal order id back onto our Order document
    req.session.pendingOrderId = result.orderId;
    req.session.pendingOrderCode = result.orderCode;

    return res.json({ id: paypalOrder.result.id, orderCode: result.orderCode });
  } catch (e) {
    console.error("Create order Error:", e);
    return res.status(500).json({ message: "Payment failed" });
  }
};

export const captureOrder = async (req, res) => {
  const orderId = req.session.pendingOrderId;
  const orderCode = req.session.pendingOrderCode;

  try {
    const { orderID } = req.body;
    if (!orderID || !orderId) {
      return res.status(400).json({ message: "Missing order reference" });
    }

    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const capture = await paypalClient.execute(request);
    const result = capture.result;

    if (result.status !== "COMPLETED") {
      await markOrderPaymentFailed(orderId, `PayPal status: ${result.status}`);
      return res.json({
        success: false,
        message: "Payment not completed",
        orderCode,
      });
    }

    const paymentDetails = result.purchase_units[0].payments.captures[0];
    const userId = req.session.user.id || req.session.user._id;

    await paymentModel.create({
      userId,
      paypalOrderId: orderID,
      paypalCaptureId: paymentDetails.id,
      amount: paymentDetails.amount.value,
      currency: paymentDetails.amount.currency_code,
      paymentStatus: result.status,
      payerEmail: req.session.user.email,
      payerName: result.payer.name.given_name,
    });

    await markOrderPaid(orderId, paymentDetails.id);
    await cartModel.updateOne({ userId }, { $set: { items: [] } });

    delete req.session.pendingOrderId;
    delete req.session.pendingOrderCode;

    return res.json({
      success: true,
      status: "COMPLETED",
      redirect: `/checkout/order-success/${orderCode}`,
    });
  } catch (error) {
    console.error("Capture Error:", error);
    if (orderId) await markOrderPaymentFailed(orderId, error.message);
    return res.status(500).json({
      success: false,
      message: "Payment failed",
      orderCode,
    });
  }
};

/* ── RETRY: re-attempt payment against the same failed Order ── */
export const retryCreateOrder = async (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user._id;
    const { orderCode } = req.params;

    const check = await getRetryableOrder(userId, orderCode);
    if (!check.success) return res.status(400).json({ message: check.message });

    const usdAmount = Math.round((check.order.totalAmount / USD_RATE) * 100) / 100;

    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: "USD", value: usdAmount.toString() } }],
    });

    const paypalOrder = await paypalClient.execute(request);

    req.session.pendingOrderId = check.order._id;
    req.session.pendingOrderCode = check.order.orderCode;

    return res.json({ id: paypalOrder.result.id });
  } catch (e) {
    console.error("Retry create order error:", e);
    return res.status(500).json({ message: "Could not start retry payment" });
  }
};