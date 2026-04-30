import mongoose from "mongoose";

let schema=mongoose.Schema

const categorySchema=new schema({
    categoryName:{
        type:String,
        unique:true,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    isActive:{
        type:Boolean,
        required:true
    },
    offer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"offer",
        default:null
    }
},{timestamps:true})


export default mongoose.model("category",categorySchema);