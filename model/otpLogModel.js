import mongoose from "mongoose";

const schema = mongoose.Schema;

const otpLogSchema = new schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    requests: [
      {
        type: Date,
        required: true,
      },
    ],
    lastRequestedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// TTL index to automatically remove logs older than 24 hours of inactivity
otpLogSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.models.OtpLog || mongoose.model("OtpLog", otpLogSchema);
