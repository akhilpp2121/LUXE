import cartModel from "../model/cartModel.js";
import cart from "../model/cartModel.js";
import variantModel from "../model/variantModel.js";
import Variant from "../model/variantModel.js";


export const CartDataTake = async (filter) => {
  try {
    const data = await cart.find(filter).populate({
      path: "variantId",
      populate: {
        path: "productId",
        populate: { path: "categoryId" }
      }
    });

    for (let item of data) {
      if (!item.variantId) continue;
      const stockQty = item.variantId.stock;   
      if (item.quantity > stockQty) {
        item.quantity = stockQty;
        await item.save();
      }
    }

    if (!data || data.length === 0) {
      return { success: false, message: "Cart is empty" };
    }

    return { success: true, data };  

  } catch (error) {
    console.error("Cart Load error:", error);
    return { success: false, message: "Something went wrong while Loading cart item" };
  }
};

export const addToCart = async (variantId, userId, quantity) => {
    try {
        if (!variantId || !userId) {
            return { success: false, message: "While adding to cart, try again" };
        }

        let variantStatus = await variantModel.findOne({
            _id: variantId,
            isActive: true,
            stock: { $gte: 1 }
        }).populate({
            path: "productId",
            populate: {
                path: "categoryId",
                match: { isActive: true }
            }
        });

        if (!variantStatus || !variantStatus.productId?.categoryId) {
            return { success: false, message: "Product might be blocked or out of stock" };
        }

       const qty = quantity || 1;

if (qty > variantStatus.stock) {
    return {
        success: false,
        message: `Only ${variantStatus.stock} item(s) available in stock`
    };
}
        

   
        let variantExist = await cartModel.findOne({ variantId: variantId, userId });

        if (variantExist) {
            return { success: false, message: "Product already in cart, go to cart!" };
        }

        let item = new cartModel({ userId, quantity: quantity|| 1, variantId: variantId });
        await item.save();

        return { success: true, message: "Product added successfully" };

    } catch (error) {
        console.error("Cart add error:", error);
        return { success: false, message: "Something went wrong while adding cart item" };
    }
};

export const cartDelete=async(id)=>{
    try {
        if(!id){
            return {success:false,message:"cart item cannot deleted"}
        }

        const deleteItems=await cartModel.deleteOne({_id:id});

        if(deleteItems.deletedCount===0){
            return{success:false,message:"cart item cannot found"}
        }

        return {success:true,message:"items removed cart successfully"}
        
    } catch (error) {
                console.error("Cart delete error:", error);
        return {
            success: false,
            message: "Something went wrong while deleting cart item"
        };

        
    }
}





export const cartEdit = async (_id, variantId, quantity) => {
    try {
        const cartItem = await cartModel.findOne({ _id, variantId });
        if (!cartItem) return { success: false, message: "Cart item not found" };

        const variant = await variantModel.findById(variantId);
        if (!variant || variant.isActive === false)
            return { success: false, message: "Product not found" };

        if (quantity < 1)  return { success: false, message: "Quantity must be at least 1" };
        if (quantity > 10) return { success: false, message: "Cannot add more than 10" };
        if (quantity > variant.stock)
            return { success: false, message: `Only ${variant.stock} items available` };

        cartItem.quantity = quantity;
        await cartItem.save();

        const unitPrice = (variant.discount && variant.discount < variant.price)
            ? variant.discount
            : variant.price;

        return { success: true, message: "Cart updated successfully", unitPrice };

    } catch (e) {
        console.error("Cart edit error:", e);
        return { success: false, message: "Server error" };
    }
};

export const getCartCount = async (userId) => {
  try {
    if (!userId) return 0;
    const count = await cartModel.countDocuments({ userId });
    return count;
  } catch (error) {
    console.error("Cart count error:", error);
    return 0;
  }
};