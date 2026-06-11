import couponModel from "../model/couponModel.js";
 
const LIMIT = 10;
 
export const getCouponsService = async ({ page = 1, search = "", status = "" }) => {
  const currentPage = Number(page) || 1;
 
  const filter = {};
 
  // Status filter
  if (status === "true")  filter.isActive = true;
  if (status === "false") filter.isActive = false;
 
  // Search filter
  if (search) {
    filter.code = new RegExp(search, "i");
  }
 
  const coupons = await couponModel
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * LIMIT)
    .limit(LIMIT);
 
  const total = await couponModel.countDocuments(filter);
 
  // Stats for metric cards
  const activeCoupons  = await couponModel.countDocuments({ isActive: true });
  const expiredCoupons = await couponModel.countDocuments({
    expiryDate: { $lt: new Date() }
  });
  const expiringSoon   = await couponModel.countDocuments({
    expiryDate: {
      $gte: new Date(),
      $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // next 7 days
    },
    isActive: true
  });
 
  return {
    coupons,
    pagination: {
      currentPage,
      totalPages: Math.ceil(total / LIMIT),
      total,
      limit: LIMIT,
    },
    stats: {
      activeCoupons,
      expiredCoupons,
      expiringSoon,
    },
    search,
    status,
  };
};
 
 
export const toggleCouponStatusService = async (couponId) => {
  const coupon = await couponModel.findById(couponId);
  if (!coupon) return { success: false, message: "Coupon not found" };
 
  coupon.isActive = !coupon.isActive;
  await coupon.save();
 
  return { success: true, isActive: coupon.isActive };
};
 
 
export const deleteCouponService = async (couponId) => {
  const coupon = await couponModel.findByIdAndDelete(couponId);
  if (!coupon) return { success: false, message: "Coupon not found" };
  return { success: true };
};




// ─── Add Coupon ───────────────────────────────────────────
export const addCouponService = async (body) => {
  const {
    code, discountType, discountValue,
    minOrderValue, maxDiscount, expiryDate,
    usageLimit, isActive,
  } = body;

  // Duplicate check
  const existing = await couponModel.findOne({ code: code.toUpperCase().trim() });
  if (existing) return { success: false, message: "Coupon code already exists" };

  const limit = usageLimit ? Number(usageLimit) : null;

  await couponModel.create({
    code:          code.toUpperCase().trim(),
    discountType,
    discountValue: Number(discountValue),
    minOrderValue: Number(minOrderValue) || 0,
    maxDiscount:   maxDiscount ? Number(maxDiscount) : null,
    expiryDate:    new Date(expiryDate),
    usageLimit:    limit,   // remaining uses
    baseLimit:     limit,   // original limit (for progress bar)
    isActive:      isActive === "on" || isActive === true,
  });

  return { success: true };
};

// ─── Get Coupon for Edit ──────────────────────────────────
export const getCouponByIdService = async (id) => {
  const coupon = await couponModel.findById(id);
  if (!coupon) return { success: false, message: "Coupon not found" };
  return { success: true, coupon };
};

// ─── Edit Coupon ──────────────────────────────────────────
export const editCouponService = async (id, body) => {
  const {
    code, discountType, discountValue,
    minOrderValue, maxDiscount, expiryDate,
    usageLimit, isActive,
  } = body;

  const coupon = await couponModel.findById(id);
  if (!coupon) return { success: false, message: "Coupon not found" };

  // Duplicate check (exclude self)
  const existing = await couponModel.findOne({
    code: code.toUpperCase().trim(),
    _id: { $ne: id },
  });
  if (existing) return { success: false, message: "Coupon code already exists" };

  const limit = usageLimit ? Number(usageLimit) : null;

  coupon.code          = code.toUpperCase().trim();
  coupon.discountType  = discountType;
  coupon.discountValue = Number(discountValue);
  coupon.minOrderValue = Number(minOrderValue) || 0;
  coupon.maxDiscount   = maxDiscount ? Number(maxDiscount) : null;
  coupon.expiryDate    = new Date(expiryDate);
  coupon.baseLimit     = limit;
  coupon.usageLimit    = limit;
  coupon.isActive      = isActive === "on" || isActive === true;

  await coupon.save();
  return { success: true };
};