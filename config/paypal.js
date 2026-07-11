import checkoutNodeJssdk from "@paypal/checkout-server-sdk";

const environment = new checkoutNodeJssdk.core.SandboxEnvironment(
  process.env.PAYPALID,
  process.env.SECRET_CODE,
);

const paypalClient = new checkoutNodeJssdk.core.PayPalHttpClient(environment);

export default paypalClient;
