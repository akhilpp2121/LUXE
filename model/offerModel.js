import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    name: String,
    type: {
      type: String,
      enum: ["PRODUCT", "CATEGORY"],
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
    },

    discountValue: Number,

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    maxDiscount: {
      type: Number,
      default: null,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("Offer", offerSchema);
