import mongoose from "mongoose";

let schema = mongoose.Schema

let cartSchema = new schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    quantity:{
        type:Number,
        required:true
    },
    variantId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Variant",
        required:true
    }
},{timestamps:true})

export default mongoose.model("Cart",cartSchema)