import mongoose from "mongoose";

let schema = mongoose.Schema

const productSchema = new schema({
    name:{
        type:String,
        required:true,
        
    },
    description:{
        type:String,
        required:true

    },
    categoryId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"category"
    },
    isActive:{
        type:Boolean,
        required:true,
        default:true
    },
    variants: [{                              
    type: mongoose.Schema.Types.ObjectId,
    ref: "Variant"
  }]

},{timestamps:true})

export default mongoose.model("Product",productSchema)