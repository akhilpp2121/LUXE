import {
  getOrderSuccess,getOrders,cancelRequestLogic,returnRequestLogic,getUserOrders

  
} from "../service/orderService.js";
import { generateInvoicePDF } from "../service/orderService.js";
import { CartDataTake } from "../service/cartService.js";
import { normaliseOrder } from "../utilites/orderHelperfile.js";

export const orderSuccessPage = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId) return res.redirect('/login');

    const result = await getOrderSuccess(userId, orderCode);

    if (!result.success) return res.redirect('/homepage');

    return res.render("Users/orderSuccess", {
      isLogged: req.session.user || '',
      order: result.order
    });

  } catch (error) {
    console.error("orderSuccessPage error:", error);
    return res.redirect('/error');
  }
};



import orderModel from "../model/orderModel.js";
import { getCartCount } from "../service/cartService.js"; 
 


const getOrderById = async (orderId) => {
  const order = await orderModel
    .findById(orderId)
    .populate("orderItems.variantId")           
    .populate("cancelledAt.cancelledProducts")  
    .lean(); 
    
 
  return order;
};
 


 

export const orderDetailsLoad = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (!req.session.user) {
      return res.redirect("/login");
    }
 
    if (!id) {
      return res.redirect("/order");
    }
 
    const userId = req.session.user._id || req.session.user.id;
 
    const rawOrder = await getOrderById(id);
 
    if (!rawOrder) {
      return res.redirect("/order");
    }
 
    if (rawOrder.userId.toString() !== userId.toString()) {
      return res.redirect("/order");
    }
 
    const order = normaliseOrder(rawOrder);
 
    const cartData = await getCartCount(userId);
 
    return res.render("Users/orderDetailsUser", {
      isLogged:   req.session.user || "",
      order:      [order],          
      pageActive: "ORDER",
      cart:       cartData.count || 0,
    });
 
  } catch (e) {
    console.error("orderDetailsLoad error:", e);
    return res.redirect("/order");
  }
};






export const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id || req.session.user.id;

    const order = await orderModel
      .findById(id)
      .populate("orderItems.variantId")
      .populate("cancelledAt.cancelledProducts")
      .lean();

    if (!order) {
      return res.status(404).send("Order not found");
    }

    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).send("Access denied");
    }

    const filename = `invoice-${order.orderCode}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    generateInvoicePDF(order, res);

  } catch (error) {
    console.error("downloadInvoice error:", error);
    return res.status(500).send("Could not generate invoice");
  }
};



export const cancellRequest = async (req, res) => {
    try {
        const { id, reason, remark, orderId } = req.body
        const userId = req.session.user._id || req.session.user.id;

        const requestProgress = await cancelRequestLogic(id, reason, remark, orderId,userId)
          
        if (!requestProgress.success) {
            return res.status(400).json({       
                success: false,
                message: requestProgress.message
            })
        }

        return res.status(200).json({
            success: true,
            message: requestProgress.message
        })

    } catch (e) {
        console.log(e)
        return res.status(500).json({          
            success: false,
            message: "Server error"
        })
    }
}





// export const returnRequest = async (req, res) => {

//   try {
//     const { orderId, reason, remark, resolution, variant, quantity } = req.body;

//     if (!orderId || !variant) {
//       return res.json({ success: false, message: "Order ID and item are required" });
//     }
//     if (!reason?.trim()) {
//       return res.json({ success: false, message: "Reason is required" });
//     }
//     if (!resolution?.trim()) {
//       return res.json({ success: false, message: "Resolution is required" });
//     }

//     const order = await orderModel.findOne({ _id: orderId });
//     if (!order) return res.json({ success: false, message: "Order not found" });
//     const orderDelivered = order.deliveryStatus === "delivered";

//     if (!order.returnedAt) order.returnedAt = [];

//     const cancelledVIds = new Set(
//       (order.cancelledAt || []).flatMap(ca =>
//         (ca.cancelledProducts || []).map(cp =>
//           cp?._id ? cp._id.toString() : String(cp)
//         )
//       )
//     );

//     const alreadyReturnedVIds = new Set(
//       (order.returnedAt || []).map(r =>
//         r.variant ? r.variant.toString() : ""
//       )
//     );

//     const isAll = variant === "ALL";

//     if (isAll) {
//       const eligible = (order.orderItems || []).filter(item => {
//         const vid = item.variantId?.toString() ?? "";
//         const itemDelivered = orderDelivered || item.deliveryStatus === "delivered";
//         return itemDelivered && !cancelledVIds.has(vid) && !alreadyReturnedVIds.has(vid);
//       });

//       if (eligible.length === 0) {
//         return res.json({ success: false, message: "No delivered items available for return" });
//       }

//       eligible.forEach(item => {
//         order.returnedAt.push({
//           reason:              reason.trim(),
//           remark:              remark || "",
//           resolution,
//           variant:             item.variantId,
//           quantity:            item.quantity,        
//           requestedAt:         new Date(),
//           returnRequestStatus: "Pending",
//         });
//       });

//       await order.save();
//       return res.json({ success: true, message: "Return request submitted for all items" });
//     }

//     if (cancelledVIds.has(variant)) {
//       return res.json({ success: false, message: "Cannot return a cancelled item" });
//     }
//     if (alreadyReturnedVIds.has(variant)) {
//       return res.json({ success: false, message: "Return already requested for this item" });
//     }

//     const orderItem = (order.orderItems || []).find(
//       item => item.variantId?.toString() === variant
//     );
//     if (!orderItem) {
//       return res.json({ success: false, message: "Item not found in this order" });
//     }
//     if (!orderDelivered && orderItem.deliveryStatus !== "delivered") {
//       return res.json({ success: false, message: "Return only allowed after delivery" });
//     }

//     const requestedQty = parseInt(quantity, 10);
//     if (!requestedQty || requestedQty < 1 || requestedQty > orderItem.quantity) {
//       return res.json({
//         success: false,
//         message: `Quantity must be between 1 and ${orderItem.quantity}`,
//       });
//     }

//     order.returnedAt.push({
//       reason:              reason.trim(),
//       remark:              remark || "",
//       resolution,
//       variant,
//       quantity:            requestedQty,
//       requestedAt:         new Date(),
//       returnRequestStatus: "Pending",
//     });

//     await order.save();
//     return res.json({ success: true, message: "Return request submitted successfully" });

//   } catch (e) {
//     console.error("returnRequest error:", e);
//     return res.json({ success: false, message: "Server error" });
//   }
// };







export const returnRequest = async (req, res) => {
  try {
    const { orderId, reason, remark, resolution, variant, quantity } = req.body;

    const result = await returnRequestLogic(
      orderId,
      reason,
      remark,
      resolution,
      variant,
      quantity
    );

    return res.json(result);

  } catch (e) {
    console.error(e);
    return res.json({ success: false, message: "Server error" });
  }
};




export const userOrdersLoad = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id || req.session.user.id;
    const page   = parseInt(req.query.page) || 1;

    const result = await getUserOrders(userId, page, 6);
    const cartCount= await getCartCount(userId)

    if (!result.success) {
      return res.redirect("/");
    }

    return res.render("Users/orderListingPage", {
      isLogged:   req.session.user || "",
      orders:     result.orders,
      pagination: result.pagination,
      cart:cartCount.count||0
    });

  } catch (e) {
    console.error("userOrdersLoad error:", e);
    return res.redirect("/");
  }
};
