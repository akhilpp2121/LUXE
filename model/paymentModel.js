import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    paypalOrderId: String,
    paypalCaptureId: String,
    amount: String,
    currency: String,
    paymentStatus: String,
    payerEmail: String,
    payerName: String

},{timestamps:true})


export default mongoose.model("Payment",paymentSchema)