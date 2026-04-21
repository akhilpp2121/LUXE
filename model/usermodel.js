import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
        googleId: {
        type: String,
        unique: true,
        sparse: true   // allows users without googleId
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      unique: true,
      required:true
    },

    password: {
      type: String,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
    isVerified:{
      type:Boolean,
      default:false
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    referalCode: {
      type: String,
      unique: true,
      sparse: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
    status: {
  type: String,
  enum: ["active", "inactive", "blocked"],
  default: "active"
},
      otp:{
        type:String
    },
    otpExpires:{
        type:Date
    },
    wallet:{
        type:Number,
        default:0
    }
  },
  {
    timestamps: true, // automatically adds createdAt & updatedAt
  }
);


export const userModel = mongoose.model("User", userSchema);
