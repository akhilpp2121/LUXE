import offerModel from "../model/offerModel.js"; 
import productsModel from "../model/productsModel.js";
import categoryModel from "../model/categoryModel.js";
export const offerDataLoad = async (filter = {}, page = 1, limit = 10) => {
  try {
    const skip  = (page - 1) * limit;
    const data  = await offerModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await offerModel.countDocuments(filter);
 
    return {
      success: true,
      data,
      pagination: {
        currentPage: Number(page),
        totalPages:  Math.ceil(total / limit),
        total,
        limit,
      },
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Error loading offers', pagination: { currentPage: 1, totalPages: 1, total: 0, limit } };
  }
};
 
export const getOfferById = async (id) => {
  try {
    const data = await offerModel.findById(id);
    if (!data) return { success: false, message: 'Offer not found' };
    return { success: true, data };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Error fetching offer' };
  }
};
 
export const createOffer = async (offerData) => {
  try {
    const existing = await offerModel.findOne({ name: { $regex: `^${offerData.name}$`, $options: 'i' } });
    if (existing) return { success: false, message: 'An offer with this name already exists' };
 
    const offer = await offerModel.create(offerData);
    return { success: true, data: offer };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Error creating offer' };
  }
};
 
export const updateOffer = async (id, offerData) => {
  try {
    const existing = await offerModel.findOne({
      name: { $regex: `^${offerData.name}$`, $options: 'i' },
      _id:  { $ne: id },
    });
    if (existing) return { success: false, message: 'An offer with this name already exists' };
 
    const updated = await offerModel.findByIdAndUpdate(id, offerData, { returnDocument:"after" });
    if (!updated) return { success: false, message: 'Offer not found' };
 
    return { success: true, data: updated };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Error updating offer' };
  }
};
 
export const toggleOfferById = async (id) => {
  try {
    const offer = await offerModel.findById(id);
    if (!offer) return { success: false, message: 'Offer not found' };
 
    offer.isActive = !offer.isActive;
    await offer.save();
 
    return { success: true, data: offer };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Error toggling offer' };
  }
};


export const calculateDiscount = async(price, offer) => {
  try {


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
    
  } catch (error) {
    console.log(error);
    return {success:false,message:"offer price cannot calculated"}
    
  }
};

export const resolveBestOffer = async (product) => {
  try {
    const productOffer = product.offer
    ? await offerModel.findById(product.offer).lean()
    : null;

  const categoryOffer = product.categoryId
    ? await offerModel.findOne({
        _id: await categoryModel
          .findById(product.categoryId)
          .select("offer")
          .then((cat) => cat?.offer),
        isActive: true,
        endDate: { $gte: new Date() },
      }).lean()
    : null;

  if (!productOffer && !categoryOffer) return null;
  if (productOffer && !categoryOffer) return productOffer;
  if (!productOffer && categoryOffer) return categoryOffer;

  const refPrice = product.variants?.[0]?.price ?? 0;
  const productDiscount  = calculateDiscount(refPrice, productOffer);
  const categoryDiscount = calculateDiscount(refPrice, categoryOffer);

  return productDiscount >= categoryDiscount ? productOffer : categoryOffer;
    
  } catch (error) {
    console.log(error);
    return {success:false,message:"cannot find best offer"}
    
  }
};
