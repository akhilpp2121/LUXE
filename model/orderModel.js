import mongoose from "mongoose";
import { generateOrderCode } from "../utilites/order.js";

const orderItemSchema = new mongoose.Schema(
  {
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    variantName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    phone_number: {
      type: String,       
      required: true,
    },
    street_address: {
      type: String,       
      required: true,
    },
    landmark: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    postal_code: {
      type: String,       
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const cancellationSchema = new mongoose.Schema(
  {
    reason: {
      type: String,
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      default: null,
    },
    cancelRequestStatus: {
      type: String,
      enum: ["Pending", "Cancelled", "Rejected"],
      default: "Cancelled",
    },
    cancelledProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variant",
      },
    ],
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    reason: {
      type: String,
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    remark: {
      type: String,
      default: null,
    },
    resolution: {
      type: String,
      default: null,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,   
      ref: "Variant",
      default: null,
    },
    quantity: {
      type: Number,
      min: 1,
    },
    returnRequestStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    orderCode: {
      type: String,
      default: generateOrderCode,   
      unique: true,
      index: true,
    },

    shippingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },

    orderItems: {
      type: [orderItemSchema],
      required: true,
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    subTotal: {
      type: Number,
      required: true,
    },

    shippingCharge: {
  type:    Number,
  default: 0,
},

    couponApplied: {       
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    orderMethod: {
      type: String,        
      enum: ["cod", "razorpay", "wallet", "upi"],
      required: true,
    },

    orderStatus: {
      type: String,
      enum: ["placed", "cancelled", "completed"],
      default: "placed",
    },

    deliveryStatus: {
      type: String,
      enum: ["pending", "shipped", "out_for_delivery", "delivered", "cancelled"],
      default: "pending",
    },

    orderShipment: {       
      type: Date,
      default: null,
    },

    orderDate: {
      type: Date,
      default: Date.now,
    },

    expectedDeliveryDate: {
      type: Date,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 5);
        return date;
      },
    },

    cancelledAt: {
      type: [cancellationSchema],
      default: [],          
    },

    returnedAt: {
      type: [returnSchema],
      default: [],          
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
