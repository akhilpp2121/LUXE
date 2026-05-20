import { getCartCount } from "../service/cartService.js";

export const attachCart = async (req, res, next) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    res.locals.cart = userId ? await getCartCount(userId) : 0;
  } catch {
    res.locals.cart = 0;
  }
  next();
};