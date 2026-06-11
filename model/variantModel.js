
import mongoose from "mongoose";

let schema = mongoose.Schema;

let variantSchema = new schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  },
  color: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  images: {
    type: [String]
  },
  stock: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  SKU: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    required: true
  },
    manualDiscount: { type: Number },
  discount: {
    type: Number,
    required: true,
    default:0
  }
}, { timestamps: true });

export default mongoose.model("Variant", variantSchema);