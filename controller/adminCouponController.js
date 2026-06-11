import { getCouponsService,toggleCouponStatusService,deleteCouponService } from "../service/adminCouponService.js";
// GET /admin/coupons
export const getCoupons = async (req, res) => {
  try {
    const { page, search, status } = req.query;

    const data = await getCouponsService({ page, search, status });

    res.render("Admin/couponPage", {
      coupons:    data.coupons,
      pagination: data.pagination,
      stats:      data.stats,
      search:     data.search,
      status:     data.status,
    });
  } catch (error) {
    console.error("getCoupons error:", error);
    res.status(500).send("Server Error");
  }
};

// PATCH /admin/coupons/:id/toggle
export const toggleCouponStatus = async (req, res) => {
  try {
    const result = await toggleCouponStatusService(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error("toggleCouponStatus error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// DELETE /admin/coupons/:id
export const deleteCoupon = async (req, res) => {
  try {
    const result = await deleteCouponService(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error("deleteCoupon error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};









import { addCouponService,getCouponByIdService,editCouponService } from "../service/adminCouponService.js";

// GET /admin/coupons-add
export const getAddCoupon = (req, res) => {
  res.render("Admin/addCouponPage");
};

// POST /admin/coupons-add
export const postAddCoupon = async (req, res) => {
  try {
    const result = await addCouponService(req.body);

    if (!result.success) {
      return res.render("Admin/addCouponPage", { error: result.message });
    }

    res.redirect("/admin/coupons");
  } catch (error) {
    console.error("postAddCoupon error:", error);
    res.render("Admin/addCouponPage", { error: "Server error. Please try again." });
  }
};

// GET /admin/coupon-edit/:id
export const getEditCoupon = async (req, res) => {
  try {
    const result = await getCouponByIdService(req.params.id);

    if (!result.success) return res.redirect("/admin/coupons");

    res.render("Admin/editCouponPage", { coupon: result.coupon });
  } catch (error) {
    console.error("getEditCoupon error:", error);
    res.redirect("/admin/coupons");
  }
};

// POST /admin/coupon-edit/:id
export const postEditCoupon = async (req, res) => {
  try {
    const result = await editCouponService(req.params.id, req.body);

    if (!result.success) {
      const couponResult = await getCouponByIdService(req.params.id);
      return res.render("Admin/editCouponPage", {
        coupon: couponResult.coupon,
        error:  result.message,
      });
    }

    res.redirect("/admin/coupons");
  } catch (error) {
    console.error("postEditCoupon error:", error);
    res.redirect("/admin/coupons");
  }
};