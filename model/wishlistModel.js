import mongoose from "mongoose";

let schema = mongoose.Schema;

let wishlistSchema = new schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },
  },
  { timestamps: true },
);

wishlistSchema.index({ userId: 1, variantId: 1 }, { unique: true });

export default mongoose.model("Wishlist", wishlistSchema);
