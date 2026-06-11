import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      required: true
    },

    discountValue: {
      type: Number,
      required: true
    },

    minOrderValue: {
      type: Number,
      default: 0
    },

    maxDiscount: {
      type: Number,
      default: null
    },

    expiryDate: {
      type: Date,
      required: true
    },

    usageLimit: {
      type: Number,
      default: 1
    },
    baseLimit:{
      type: Number,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Coupon", couponSchema);