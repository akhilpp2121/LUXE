import { CartDataTake ,addToCart,cartDelete,cartEdit} from "../service/cartService.js";
import { findUserBlocked } from "../service/userService.js";


export const cartPageLoad = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/login");

    const userId = user._id || user.id;
    const cartData = await CartDataTake(userId);

    //  Empty cart — early return with all required variables
    if (!cartData.success) {
      return res.status(200).render("Users/cart", {
        isLogged: req.session.user || '',
        email: '',
        data: [],
        price: 0,
        cart: 0,
      });
    }

    //  Price calculation only when cart has data
    const price = cartData.data.reduce((sum, item) => {
      const variant  = item.variantId;
      const product  = variant?.productId;
      const category = product?.categoryId;

      const outOfStock       = (variant?.stock ?? 0) < 1;
      const variantInactive  = !variant?.isActive;
      const productInactive  = !product?.isActive;
      const categoryInactive = !category?.isActive;

      if (outOfStock || variantInactive || productInactive || categoryInactive) return sum;

      const effectivePrice = (variant.discount && variant.discount < variant.price)
        ? variant.discount
        : variant.price;

      return sum + (effectivePrice * item.quantity);
    }, 0);

    return res.status(200).render("Users/cart", {
      isLogged: req.session.user || '',
      email: '',
      data: cartData.data,
      price,
      cart: cartData.data.length,
    });

  } catch (error) {
    console.log(error);
    res.redirect("/error");
  }
};

export const cartAdd = async (req, res) => {
    try {
        
        
        
        const user = req.session.user;
        
        if (!user) {
            return res.status(401).json({ success: false, message: "Please login to add to cart" });
        }
        

        const { variantId, qty } = req.body;  
        const userId = user._id || user.id;
        const userIsBlocked= await findUserBlocked(userId);
        if(userIsBlocked){
            return res.status(401).json({success:false,message:"user is blocked you can't add products in you cart"})
        }


        
        if (!variantId) {
            return res.status(400).json({ success: false, message: "Error while adding to cart" });
        }
       
    const quantity = parseInt(qty);

if (!quantity || isNaN(quantity) || quantity < 1) {
    return res.status(400).json({ success: false, message: "Invalid quantity" });
}

if (quantity > 10) {
    return res.status(400).json({ success: false, message: "You cannot add more than 10 pieces" });
}

        const cartAddProgress = await addToCart(variantId, userId, quantity);
        req.session.message = cartAddProgress.message;
    
        if (!cartAddProgress.success) {
            return res.status(500).json({ success: false, message: cartAddProgress.message });
        }

        return res.status(200).json({ success: true, message: cartAddProgress.message });

    } catch (error) {
        console.error('Error adding to cart:', error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

export const removeCartProducts = async (req, res) => {
  try {
    
    
    const { variantId } = req.body;
    const userId = req.session.user._id || req.session.user.id;

    if (!variantId) {
      return res.status(400).json({ success: false, message: "variantId is required" });
    }

    const cartRemovingProgress = await cartDelete(userId, variantId);

    if (!cartRemovingProgress.success) {
      return res.status(500).json({
        success: false,
        message: cartRemovingProgress.message
      });
    }

    return res.json({
      success: true,
      redirect: "/cart"
    });

  } catch (error) {
    console.error("Error removing cart item:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};


export const quantityUpdate = async (req, res) => {
    try {
        const { cartId, variantId, quantity } = req.body;


        const user = req.session.user;
        
        if (!user) {
            return res.status(401).json({ success: false, message: "Please login to add to cart" });
        }
        

                const userId = user._id || user.id;

        const userIsBlocked= await findUserBlocked(userId);
        if(userIsBlocked){
            return res.status(401).json({success:false,message:"user is blocked you can't add products in you cart"})
        }

        if (!cartId || !variantId || !quantity) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const editProgress = await cartEdit(userId, variantId, Number(quantity));


        if (!editProgress.success) {
            return res.status(500).json({
                success: false,
                message: editProgress.message
            });
        }

        return res.json({
    success: true,
    message: editProgress.message,
    unitPrice: editProgress.unitPrice  
});

    } catch (e) {
        console.error('Error updating cart quantity:', e);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};