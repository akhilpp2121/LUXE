import {
  userLoginLogic,
  resetPasswordService,
  verifyEmailService,
  registerPreCheckService,
  handleOtpVerifyService,
  canLoadResetPassword,
  resendOtpService,
  findUserBlocked,
} from "../service/userService.js";
import { variantDataLoad } from "../service/productsService.js";
import variantModel from "../model/variantModel.js";
import {
  getHomePageData,
  getProductDetailData,
} from "../service/userProductService.js";

export const userLandingLoad = (req, res) => {
  if (req.session.user) return res.redirect("/homePage");
  return res.render("Users/LandingPage");
};

export const userLoginLoad = (req, res) => {
  if (req.session.user) return res.redirect("/homePage");
  return res.render("Users/login", { message: null });
};

export const userSignUpLoad = (req, res) => {
  if (req.session.user) return res.redirect("/homePage");
  const referralToken = req.session.referralToken || "";
  return res.render("Users/signUp", { message: null, referralToken });
};

export const userForgotPasswordLoad = (req, res) => {
  if (req.session.user) return res.redirect("/homePage");
  return res.render("Users/emailVerification");
};

export const otpPageLoad = (req, res) => {
  const email = req.session.email || req.session.tempEmail;
  if (!email) return res.redirect("/login");
  return res.render("Users/otpPage", { email });
};

export const homeLoad = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/login");

    const userId = user._id || user.id;

    const isBlockedUser = await findUserBlocked(userId);
    if (isBlockedUser) {
      req.session.user = null;
      req.session.flashMessage = {
        type: "error",
        message: "Your account has been blocked.",
      };
      return res.redirect("/login");
    }

    const searchQuery = (req.query.search ?? "").trim();
    const { products } = await getHomePageData(searchQuery);

    const flashMessage = req.session.flashMessage || null;
    req.session.flashMessage = null;

    return res.render("Users/homePage", {
      user,
      flashMessage,
      product: products,
      searchQuery,
    });
  } catch (error) {
    console.error("Home page load error:", error);
    return res.redirect("/login");
  }
};

export const registerController = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, referralCode } = req.body;
    console.log(email, password);

    const result = await registerPreCheckService(
      req,
      fullName,
      email,
      password,
      phoneNumber,
      referralCode,
    );

    if (!result.success) {
      return res.render("Users/signUp", {
        message: result.message,
        referralToken: referralCode || "",
      });
    }

    return res.redirect(result.redirect);
  } catch (err) {
    console.error("registerController error:", err);
    return res.render("Users/signUp", {
      message: "Server error. Please try again.",
      referralToken: req.body.referralCode || "",
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const result = await userLoginLogic(req, req.body.email, req.body.password);

    if (!result.success) {
      return res
        .status(401)
        .json({ success: false, message: result.message, field: result.field });
    }

    return res.json({ success: true, redirect: "/homePage" });
  } catch (err) {
    console.error("loginController error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export async function googleCallback(req, res) {
  try {
    const user = req.user;

    req.session.user = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
      phoneNumber: user.phoneNumber || "",
    };

    return res.redirect("/homePage");
  } catch (err) {
    console.error("googleCallback error:", err);
    return res.redirect("/login");
  }
}

export const verifyEmailController = async (req, res) => {
  try {
    const result = await verifyEmailService(req, req.body.email);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error("verifyEmailController error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const verifyOtpController = async (req, res) => {
  try {
    const result = await handleOtpVerifyService(req);

    return res.json(result);
  } catch (err) {
    console.error("verifyOtpController error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};

export const resetPasswordLoad = async (req, res) => {
  try {
    let user = req.session.user;

    if (user) {
      return res.redirect("/homePage");
    }

    const allowed = await canLoadResetPassword(req);
    if (!allowed) return res.redirect("/login");
    return res.render("Users/resetPassword");
  } catch (err) {
    console.error("resetPasswordLoad error:", err);
    return res.redirect("/login");
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const email = req.session.email;

    if (!email) return res.json({ success: false, message: "Session expired" });

    if (password !== confirmPassword) {
      return res.json({ success: false, message: "Passwords do not match" });
    }

    const result = await resetPasswordService(email, password);
    if (!result.success) return res.json(result);

    req.session.email = null;
    req.session.otpContext = null;

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};

export const resendOtpController = async (req, res) => {
  try {
    const result = await resendOtpService(req);
    return res.json(result);
  } catch (err) {
    console.error("resendOtpController error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};
export const logoutUserController = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/homePage");
    }

    res.clearCookie("connect.sid");

    return res.redirect("/login");
  });
};

// product

import { getCartCount } from "../service/cartService.js";
import { getFilteredProducts } from "../service/userProductService.js";
import { wishlistCheck } from "../service/wishlistServie.js";

export const productListingLoad = async (req, res) => {
  try {
    const data = await getFilteredProducts(req.query);

    const cartCount = await getCartCount(req.session.user?._id);
    const userId = req.session.user._id || req.session.user.id;
    const wishlistResult = await wishlistCheck(userId);
    const wishlistedIds = wishlistResult.success ? wishlistResult.data : [];

    const buildPagination = (current, total) => {
      if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

      const pages = new Set([1, total, current]);
      for (let i = current - 1; i <= current + 1; i++) {
        if (i >= 1 && i <= total) pages.add(i);
      }

      const sorted = [...pages].sort((a, b) => a - b);
      const result = [];

      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
        result.push(sorted[i]);
      }

      return result;
    };

    return res.render("Users/productListingPage", {
      product: data.products,
      cartCount: cartCount,
      searchValue: data.filters.search,
      sortValue: data.filters.sort,
      categoryValue: data.filters.category,
      minPrice: data.filters.minPrice,
      maxPrice: data.filters.maxPrice,
      categories: data.categories,
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      totalProducts: data.total,
      paginationPages: buildPagination(data.currentPage, data.totalPages),
      productsPerPage: data.LIMIT,
      wishlistedIds,

      error: "",
    });
  } catch (err) {
    console.error("productListingLoad:", err);

    res.render("Users/productListingPage", {
      product: [],
      cartCount: 0,

      searchValue: "",
      sortValue: "",
      categoryValue: "",
      minPrice: "",
      maxPrice: "",
      categories: [],
      currentPage: 1,
      totalPages: 1,
      totalProducts: 0,
      paginationPages: [1],
      productsPerPage: 9,
      wishlistedIds: [],
      error: "Server error",
    });
  }
};

export const productDetailLoad = async (req, res) => {
  const { productId } = req.params;

  try {
    const data = await getProductDetailData(productId);

    if (!data.success && data.reason === "not_found") {
      return res
        .status(404)
        .render("Users/404", { message: "Product not found" });
    }

    if (!data.success && data.reason === "unavailable") {
      return res.render("Users/productDetailsPage", {
        product: null,
        variants: [],
        allVariants: [],
        defaultVariant: null,
        sizes: [],
        colors: [],
        relatedProducts: [],
        unavailable: true,
        error: "",
      });
    }

    return res.render("Users/productDetailsPage", {
      product: data.product,
      variants: data.variants,
      allVariants: data.allVariants,
      defaultVariant: data.defaultVariant,
      sizes: data.sizes,
      colors: data.colors,
      relatedProducts: data.relatedProducts,
      unavailable: false,
      error: "",
    });
  } catch (err) {
    console.error("productDetailLoad error:", err);
    return res.status(500).render("Users/productDetailsPage", {
      product: null,
      variants: [],
      allVariants: [],
      defaultVariant: null,
      sizes: [],
      colors: [],
      relatedProducts: [],
      unavailable: false,
      error: "Something went wrong. Please try again.",
    });
  }
};

export const getProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;

    const variants = await variantModel.find({
      productId,
      isActive: true,
      stock: { $gt: 0 },
    }).select("size color price discount stock images");

    if (!variants.length) {
      return res.json({ success: false, message: "No variants available" });
    }

    return res.json({ success: true, variants });
  } catch (error) {
    console.error("getProductVariants error:", error);
    return res.json({ success: false, message: "Server error" });
  }
};
