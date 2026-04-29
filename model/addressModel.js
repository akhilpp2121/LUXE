import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    fullName: {
      type: String,
      required: true
    },
    phoneNumber: {
  type: String,
  required: true
},

    houseNumber: {
      type: String,
      required: true
    },

    streetName: {
      type: String,
      required: true
    },

    landmark: {
      type: String
    },

    city: {
      type: String,
      required: true
    },

    state: {
      type: String,
      required: true
    },

    country: {
      type: String,
      required: true,
      default: "India"
    },

    pincode: {
      type: String,
      required: true
    },

    isDefault: {
      type: Boolean,
      default: false
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export const addressModel = mongoose.model("Address", addressSchema);
