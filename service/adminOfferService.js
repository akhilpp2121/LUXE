import offerModel from "../model/offerModel.js";
import productsModel from "../model/productsModel.js";
import categoryModel from "../model/categoryModel.js";

export const offerDataLoad = async (filter = {}, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    const data = await offerModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await offerModel.countDocuments(filter);

    return {
      success: true,
      data,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Error loading offers",
      pagination: { currentPage: 1, totalPages: 1, total: 0, limit },
    };
  }
};

export const getOfferById = async (id) => {
  try {
    const data = await offerModel.findById(id);
    if (!data) return { success: false, message: "Offer not found" };
    return { success: true, data };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Error fetching offer" };
  }
};

// This was already correct logic-wise, kept as-is (matches the 99 threshold
// now used consistently in the controller + frontend too).
const validateOfferData = ({ discountType, discountValue, maxDiscount }) => {
  const type = (discountType || "").toUpperCase();
  const value = Number(discountValue);

  if (isNaN(value) || value <= 0) {
    return "Discount value must be a positive number";
  }

  if (type === "PERCENTAGE") {
    if (value > 99) {
      return "Percentage discount cannot be 100% or more";
    }
    if (maxDiscount === undefined || maxDiscount === null || maxDiscount === "") {
      return "Max discount cap is required for percentage offers";
    }
    const cap = Number(maxDiscount);
    if (isNaN(cap) || cap <= 0) {
      return "Max discount cap must be a positive number";
    }
  } else if (type === "FLAT") {
    if (maxDiscount !== undefined && maxDiscount !== null && maxDiscount !== "") {
      const cap = Number(maxDiscount);
      if (!isNaN(cap) && cap > 0 && cap < value) {
        return "Max discount cannot be less than the flat discount value";
      }
    }
  } else {
    return "Invalid discount type";
  }

  return null;
};

export const createOffer = async (offerData) => {
  try {
    const validationError = validateOfferData(offerData);
    if (validationError) return { success: false, message: validationError };

    const existing = await offerModel.findOne({
      name: { $regex: `^${offerData.name}$`, $options: "i" },
    });
    if (existing)
      return {
        success: false,
        message: "An offer with this name already exists",
      };

    const offer = await offerModel.create({
      ...offerData,
      discountType: offerData.discountType.toUpperCase(),
    });
    return { success: true, data: offer };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Error creating offer" };
  }
};

export const updateOffer = async (id, offerData) => {
  try {
    const validationError = validateOfferData(offerData);
    if (validationError) return { success: false, message: validationError };

    const existing = await offerModel.findOne({
      name: { $regex: `^${offerData.name}$`, $options: "i" },
      _id: { $ne: id },
    });
    if (existing)
      return {
        success: false,
        message: "An offer with this name already exists",
      };

    
    const updated = await offerModel.findByIdAndUpdate(
      id,
      { ...offerData, discountType: offerData.discountType.toUpperCase() },
      { new: true, runValidators: true }
    );
    if (!updated) return { success: false, message: "Offer not found" };

    return { success: true, data: updated };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Error updating offer" };
  }
};

export const toggleOfferById = async (id) => {
  try {
    const offer = await offerModel.findById(id);
    if (!offer) return { success: false, message: "Offer not found" };

    offer.isActive = !offer.isActive;
    await offer.save();

    return { success: true, data: offer };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Error toggling offer" };
  }
};

export const calculateDiscount = (price, offer) => {
  try {
    if (!offer || !price) return 0;

    let savings = 0;
    if (offer.discountType === "PERCENTAGE") {
      savings = price * (offer.discountValue / 100);
      // This cap logic was already correct: % discount, then clamp to maxDiscount
      if (offer.maxDiscount && savings > offer.maxDiscount) {
        savings = offer.maxDiscount;
      }
    } else if (offer.discountType === "FLAT") {
      savings = offer.discountValue;
    }

    // Never let savings exceed the price itself (e.g. a ₹500 flat offer on a ₹300 item)
    return Math.min(savings, price);
  } catch (error) {
    console.error(error);
    return 0;
  }
};

export const resolveBestOffer = async (product) => {
  try {
    const now = new Date();

    const productOffer = product.offer
      ? await offerModel
          .findOne({
            _id: product.offer,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
          })
          .lean()
      : null;

    let categoryOffer = null;
    if (product.categoryId) {
      const category = await categoryModel
        .findById(product.categoryId)
        .select("offer")
        .lean();

      if (category?.offer) {
        categoryOffer = await offerModel
          .findOne({
            _id: category.offer,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
          })
          .lean();
      }
    }

    if (!productOffer && !categoryOffer) return null;
    if (productOffer && !categoryOffer) return productOffer;
    if (!productOffer && categoryOffer) return categoryOffer;

   
    const refPrice = product.variants?.[0]?.price ?? 0;
    const productDiscount = calculateDiscount(refPrice, productOffer);
    const categoryDiscount = calculateDiscount(refPrice, categoryOffer);

    return productDiscount >= categoryDiscount ? productOffer : categoryOffer;
  } catch (error) {
    console.error(error);
    return null;
  }
};