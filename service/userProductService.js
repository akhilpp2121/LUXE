import Variant from "../model/variantModel.js";
import Category from "../model/categoryModel.js";
import Product from "../model/productsModel.js";

export const getHomePageData = async (searchQuery = "") => {
  try {
    let variantFilter = { isActive: true, stock: { $gt: 0 } };

    if (searchQuery) {
      const matchingProducts = await Product.find({
        isActive: true,
        name: { $regex: searchQuery, $options: "i" },
      }).select("_id");

      const matchingProductIds = matchingProducts.map((p) => p._id);
      if (matchingProductIds.length === 0)
        return { success: true, products: [] };

      variantFilter.productId = { $in: matchingProductIds };
    }

    const all = await Variant.find(variantFilter)
      .populate({
        path: "productId",
        populate: [
          { path: "categoryId", populate: { path: "offer" } },
          { path: "offer" },
        ],
      })
      .lean();

    const seenProducts = new Set();
    const unique = [];

    for (const v of all) {
      if (unique.length >= 8) break;
      if (!v.productId) continue;
      if (!v.productId.isActive) continue;
      if (!v.productId.categoryId) continue;
      if (!v.productId.categoryId.isActive) continue;

      const pid = v.productId._id.toString();
      if (seenProducts.has(pid)) continue;
      seenProducts.add(pid);

      const originalPrice = v.price;
      const productOffer = v.productId.offer || null;
      const categoryOffer = v.productId.categoryId?.offer || null;

      const getDiscount = (price, offer) => {
        if (!offer || !offer.isActive) return 0;
        if (new Date(offer.endDate) < new Date()) return 0;

        let savings = 0;
        if (offer.discountType === "PERCENTAGE") {
          savings = price * (offer.discountValue / 100);
          if (offer.maxDiscount && savings > offer.maxDiscount) {
            savings = offer.maxDiscount;
          }
        } else if (offer.discountType === "FLAT") {
          savings = offer.discountValue;
        }
        return Math.min(savings, price);
      };

      const productSavings = getDiscount(originalPrice, productOffer);
      const categorySavings = getDiscount(originalPrice, categoryOffer);
      const bestSavings = Math.max(productSavings, categorySavings);

      let discountedPrice = null;
      let savings = 0;

      if (bestSavings > 0) {
        //  Offer applied — use offer price
        discountedPrice = Math.round(originalPrice - bestSavings);
        savings = Math.round(bestSavings);
      } else if (v.manualDiscount && v.manualDiscount < originalPrice) {
        //  No offer — show manual discount from creation time
        discountedPrice = v.manualDiscount;
        savings = Math.round(originalPrice - v.manualDiscount);
      }
      // else — no discount at all, show original price only

      unique.push({
        _id: v._id,
        productId: v.productId,
        size: v.size,
        color: v.color,
        images: v.images,
        price: originalPrice,
        discount: discountedPrice,
        save: savings,
      });
    }

    return { success: true, products: unique };
  } catch (error) {
    console.error("getHomePageData error:", error);
    return { success: false, products: [] };
  }
};

export const getFilteredProducts = async (query) => {
  const search = (query.search || "").trim();
  const sort = query.sort || "";
  const category = query.category || "";
  const minPrice = query.minPrice || "";
  const maxPrice = query.maxPrice || "";
  const page = Math.max(1, parseInt(query.page) || 1);
  const LIMIT = 6;

  //  Active categories
  const activeCategories = await Category.find({ isActive: true }).lean();
  const activeCatIds = new Set(activeCategories.map((c) => c._id.toString()));

  //  Fetch variants
  const all = await Variant.find({}).populate("productId").lean();

  const seenProducts = new Set();
  let variants = [];

  for (const v of all) {
    if (!v.productId) continue;
    if (!v.productId.isActive) continue;
    if (v.productId.isBlocked) continue;
    if (!v.isActive) continue;
    if (v.stock <= 0) continue;

    //  Category active check
    const catId = v.productId.categoryId?.toString();
    if (catId && !activeCatIds.has(catId)) continue;

    const pid = v.productId._id.toString();
    if (!seenProducts.has(pid)) {
      seenProducts.add(pid);
      variants.push({ ...v, save: v.price - v.discount });
    }
  }

  //  SEARCH
  if (search) {
    const re = new RegExp(search, "i");
    variants = variants.filter((v) => re.test(v.productId.name));
  }

  //  CATEGORY FILTER
  if (category) {
    variants = variants.filter(
      (v) => v.productId.categoryId?.toString() === category,
    );
  }

  // PRICE FILTER
  if (minPrice) variants = variants.filter((v) => v.discount >= +minPrice);
  if (maxPrice) variants = variants.filter((v) => v.discount <= +maxPrice);

  //  SORT
  const getPrice = (v) =>
    v.discount && v.discount < v.price ? v.discount : v.price;

  if (!sort)
    variants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sort === "lowToHigh") variants.sort((a, b) => getPrice(a) - getPrice(b));
  if (sort === "highToLow") variants.sort((a, b) => getPrice(b) - getPrice(a));
  if (sort === "az")
    variants.sort((a, b) => a.productId.name.localeCompare(b.productId.name));
  if (sort === "za")
    variants.sort((a, b) => b.productId.name.localeCompare(a.productId.name));

  const total = variants.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const safePage = Math.min(page, totalPages);
  const products = variants.slice((safePage - 1) * LIMIT, safePage * LIMIT);

  return {
    products,
    total,
    totalPages,
    currentPage: safePage,
    categories: activeCategories,
    filters: { search, sort, category, minPrice, maxPrice },
    LIMIT,
  };
};

const getStockState = (stock) => {
  if (stock <= 0) return "sold_out";
  if (stock <= 5) return "low_stock";
  return "in_stock";
};

export const getProductDetailData = async (productId) => {
  const product = await Product.findById(productId).lean();

  if (!product) return { success: false, reason: "not_found" };
  if (!product.isActive) return { success: false, reason: "unavailable" };
  if (product.isBlocked) return { success: false, reason: "unavailable" };

  if (product.categoryId) {
    const category = await Category.findById(product.categoryId).lean();
    if (!category || category.isActive === false)
      return { success: false, reason: "unavailable" };
  }

  const rawVariants = await Variant.find({ productId, isActive: true }).lean();
  if (!rawVariants.length) return { success: false, reason: "unavailable" };

  const allVariants = rawVariants.map((v) => ({
    _id: v._id,
    size: v.size,
    color: v.color,
    price: v.price,
    discount: v.discount,
    stock: v.stock,
    images: v.images || [],
    stockState: getStockState(v.stock),
    save: v.price - (v.discount || v.price),
  }));

  const seenColors = new Set();
  const variants = [];
  for (const v of allVariants) {
    const color = v.color?.toLowerCase();
    if (!color || seenColors.has(color)) continue;
    seenColors.add(color);
    variants.push(v);
  }

  const sizes = [...new Set(allVariants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(allVariants.map((v) => v.color).filter(Boolean))];

  const defaultVariant =
    allVariants.find((v) => v.stockState !== "sold_out") || allVariants[0];

  // Related products
  let relatedProducts = [];
  if (product.categoryId) {
    const relatedVariants = await Variant.find({
      isActive: true,
      stock: { $gt: 0 },
    })
      .populate({
        path: "productId",
        match: {
          _id: { $ne: productId },
          categoryId: product.categoryId,
          isActive: true,
          isBlocked: { $ne: true },
        },
      })
      .lean();

    const seen = new Set();
    for (const v of relatedVariants) {
      if (!v.productId) continue;
      const pid = v.productId._id.toString();
      if (seen.has(pid)) continue;
      seen.add(pid);
      relatedProducts.push({
        productId: pid,
        name: v.productId.name,
        image: v.images?.[0] || null,
        price: v.price,
        discount: v.discount,
        stockState: getStockState(v.stock),
      });
      if (relatedProducts.length >= 4) break;
    }
  }

  return {
    success: true,
    product: {
      _id: product._id,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
    },
    variants, // unique per color — for swatches
    allVariants, // all — for size grid
    defaultVariant,
    sizes,
    colors,
    relatedProducts,
  };
};










