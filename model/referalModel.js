import mongoose from "mongoose";

const referralTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  used: {
    type: Boolean,
    default: false
  }
},{ timestamps: true });

export default mongoose.model("ReferralToken", referralTokenSchema);