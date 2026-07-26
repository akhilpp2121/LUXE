import mongoose from "mongoose";
import Product from "../model/productsModel.js";
import Variant from "../model/variantModel.js";
import offerModel from "../model/offerModel.js";
import categoryModel from "../model/categoryModel.js";

export const productModelLoad = async (filter = {}, sort = {}, pageNo = 1) => {
  try {
    const page = parseInt(pageNo) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const offers = await offerModel.find({
      isActive: true,
      endDate: { $gte: new Date() },
      type: "PRODUCT", // only product-type offers
    });

    const products = await Product.find(filter)
      .populate("categoryId")
      .populate("offer")
      .populate("variants")
      .populate("offer")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return {
      success: true,
      data: products,
      currentPage: page,
      totalPages: totalPages,
      totalUser: total,
      offers,
    };
  } catch (error) {
    console.error("productModelLoad error:", error);
    return { success: false };
  }
};

export const variantDataLoad = async (filter = {}) => {
  try {
    if (filter.productId) {
      filter.productId = new mongoose.Types.ObjectId(filter.productId);
    }
    const variants = await Variant.find(filter);
    return { success: true, data: variants };
  } catch (error) {
    console.error("variantDataLoad error:", error);
    return { success: false, data: [] };
  }
};

export const adminProductsAddLogic = async (
  productName,
  category,
  description,
  isActive,
  variants,
) => {
  try {
    const newProduct = new Product({
      name: productName,
      categoryId: category,
      description,
    });

    const savedProduct = await newProduct.save();

    const variantDocs = variants.map((v) => ({
      productId: savedProduct._id,
      color: v.color,
      size: v.size,
      SKU: v.sku,
      stock: v.stock,
      price: v.price,
      manualDiscount: v.manualDiscount,
      discount: v.discount,
      images: v.images,
      isActive: true,
    }));

    const savedVariants = await Variant.insertMany(variantDocs);

    savedProduct.variants = savedVariants.map((v) => v._id);
    await savedProduct.save();

    return { success: true };
  } catch (error) {
    console.error("Error in adminProductsAddLogic:", error);
    return { success: false, message: "Error creating product" };
  }
};
export async function generateUniqueSKU(productName, color, size, index = 1) {
  const nameCode = (productName || "PRD")
    .trim()
    .split(/\s+/)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 4);

  const colorCode = (color || "CLR")
    .replace(/\s+/g, "")
    .slice(0, 3)
    .toUpperCase();

  const sizeMap = { Small: "S", Medium: "M", Large: "L", XL: "XL", XXL: "XXL" };
  const sizeCode = sizeMap[size] || (size || "SZ").slice(0, 2).toUpperCase();

  const prefix = `${nameCode}-`;
  const existing = await Variant.find(
    { SKU: { $regex: `^${prefix}` } },
    { SKU: 1 },
  );

  let maxSeq = 0;
  existing.forEach((v) => {
    const parts = v.SKU?.split("-");
    if (parts && parts[1]) {
      const n = parseInt(parts[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });

  let seq = maxSeq + index;
  let sku, collision;
  do {
    sku = `${nameCode}-${String(seq).padStart(3, "0")}-${colorCode}-${sizeCode}`;
    collision = await Variant.findOne({ SKU: sku });
    if (collision) seq++;
  } while (collision);

  return sku;
}

export const productFindById = async (id) => {
  try {
    const product = await Product.findById(id).populate("categoryId");
    if (!product) return { success: false, message: "Product not found" };
    return { success: true, data: product };
  } catch (error) {
    console.error("productFindById error:", error);
    return { success: false, message: "Database error" };
  }
};

export const updatedProducts = async ({
  productId,
  name,
  categoryId,
  description,
}) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      productId,
      { name, categoryId, description },
      { returnDocument: "after", runValidators: true },
    );

    if (!updated) {
      return { success: false, message: "product not found" };
    }
    return { success: true, data: updated };
  } catch (error) {
    console.log("updated products error", error);
    return { success: false, message: error.message };
  }
};

export const upsertVariant = async ({ productId, variantId, variantData }) => {
  try {
    const { isActive, ...safeData } = variantData;

    const duplicateQuery = {
      productId,
      color: { $regex: new RegExp(`^${safeData.color}$`, "i") },
      size: safeData.size,
    };
    if (variantId) {
      duplicateQuery._id = { $ne: variantId };
    }
    const duplicate = await Variant.findOne(duplicateQuery);
    if (duplicate) {
      return {
        success: false,
        message: `A variant with color "${safeData.color}" and size "${safeData.size}" already exists for this product`,
      };
    }

    if (variantId) {
      const updated = await Variant.findByIdAndUpdate(
        variantId,
        { $set: safeData },
        { returnDocument: "after" },
      );
      if (!updated) return { success: false, message: "Variant not found" };
      return { success: true, data: updated };
    } else {
      const created = await Variant.create({
        ...safeData,
        productId,
        isActive: true,
      });
      await Product.findByIdAndUpdate(productId, {
        $push: { variants: created._id },
      });
      return { success: true, data: created };
    }
  } catch (err) {
    console.error("upsertVariant error:", err);
    return { success: false, message: err.message };
  }
};
export const updateVariantStatuses = async (productId, changes) => {
  const ops = changes.map(({ variantId, isActive }) => ({
    updateOne: {
      filter: { _id: variantId },
      update: { $set: { isActive } },
    },
  }));

  const result = await Variant.bulkWrite(ops);
  return result;
};







export const applyOffersToProduct = async (productId) => {
  try {
    // Fetch raw first so we always have a reliable categoryId, regardless
    // of whether populate succeeds
    const rawProduct = await Product.findById(productId);
    if (!rawProduct) return { success: false, message: "Product not found" };

    const categoryId = rawProduct.categoryId; // raw ObjectId, not populated

    const product = await Product.findById(productId).populate("offer");
    if (!product) return { success: false, message: "Product not found" };

    const now = new Date();

    const productOffer =
      product.offer &&
      product.offer.isActive &&
      product.offer.startDate <= now &&
      product.offer.endDate >= now
        ? product.offer
        : null;

    let categoryOffer = null;
    if (categoryId) {
      const cat = await categoryModel.findById(categoryId).populate("offer");

      if (
        cat &&
        cat.offer &&
        cat.offer.isActive &&
        cat.offer.startDate <= now &&
        cat.offer.endDate >= now
      ) {
        categoryOffer = cat.offer;
      }
    } else {
      console.warn(`[applyOffersToProduct] Product ${productId} has no categoryId set`);
    }

    const calculateSavings = (price, offer) => {
      if (!offer) return 0;
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

    const variants = await Variant.find({ productId });

    for (const variant of variants) {
      const originalPrice = variant.price;
      const productSavings = calculateSavings(originalPrice, productOffer);
      const categorySavings = calculateSavings(originalPrice, categoryOffer);
      const bestSavings = Math.max(productSavings, categorySavings);

      if (bestSavings > 0) {
        variant.discount = Math.round(originalPrice - bestSavings);
      } else {
        variant.discount = variant.manualDiscount ?? originalPrice;
      }

      await variant.save();
    }

    return { success: true, appliedCategoryOffer: !!categoryOffer, appliedProductOffer: !!productOffer };
  } catch (error) {
    console.error(`applyOffersToProduct error for ${productId}:`, error);
    return { success: false, message: error.message };
  }
};





// export const applyOffersToProduct = async (productId) => {
//   try {
//     const product = await Product.findById(productId)
//       .populate("offer")
//       .populate("categoryId");

//     if (!product) return { success: false, message: "Product not found" };

//     const now = new Date();

//     const productOffer =
//       product.offer &&
//       product.offer.isActive &&
//       product.offer.startDate <= now &&
//       product.offer.endDate >= now
//         ? product.offer
//         : null;

//     let categoryOffer = null;
//     if (product.categoryId) {
//       const cat = await categoryModel
//         .findById(product.categoryId._id)
//         .populate("offer");

//       if (
//         cat &&
//         cat.offer &&
//         cat.offer.isActive &&
//         cat.offer.startDate <= now &&
//         cat.offer.endDate >= now
//       ) {
//         categoryOffer = cat.offer;
//       }
//     }

//     const calculateSavings = (price, offer) => {
//       if (!offer) return 0;
//       let savings = 0;
//       if (offer.discountType === "PERCENTAGE") {
//         savings = price * (offer.discountValue / 100);
//         if (offer.maxDiscount && savings > offer.maxDiscount) {
//           savings = offer.maxDiscount;
//         }
//       } else if (offer.discountType === "FLAT") {
//         savings = offer.discountValue;
//       }
//       return Math.min(savings, price);
//     };

//     const variants = await Variant.find({ productId });

//     for (const variant of variants) {
//       const originalPrice = variant.price;
//       const productSavings = calculateSavings(originalPrice, productOffer);
//       const categorySavings = calculateSavings(originalPrice, categoryOffer);
//       const bestSavings = Math.max(productSavings, categorySavings);

//       if (bestSavings > 0) {
//         variant.discount = Math.round(originalPrice - bestSavings);
//       } else {
//         variant.discount = variant.manualDiscount ?? originalPrice;
//       }

//       await variant.save();
//     }

//     return { success: true };
//   } catch (error) {
//     console.error("applyOffersToProduct error:", error);
//     return { success: false, message: error.message };
//   }
// };