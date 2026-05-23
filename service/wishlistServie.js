import wishlistModel from "../model/wishlistModel.js";
import cartModel from "../model/cartModel.js";

export const wishlistData=async(filter)=>{

    try {
        
  const data=await wishlistModel.find(filter).populate({path:'variantId',populate:{path:"productId"}});


  if(!data){
    return
    {
        success:false,
        message: "Error while loading"
    }
  }

  return{
    success:true,
    data:data
  }

    } catch (error) {
        console.log(error);

        return {success:false,message:"Server error"}
        
        
    }
}