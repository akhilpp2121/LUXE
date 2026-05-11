
import mongoose from "mongoose";
import category from "../model/categoryModel.js";
import Product from "../model/productsModel.js";
import Variant from "../model/variantModel.js";

export const productModelLoad = async (filter, sort, pageNo) => {
  try {
    const page = parseInt(pageNo) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const products = await Product.find(filter)
      .populate("categoryId")
      .populate({                  
    path: "variants",
    model: "Variant",
    foreignField: "productId",
    localField: "_id"
  })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return {
      success: true,
      data: products,
      currentPage: page,
      totalPages: totalPages,
      totalUser: total,
    };
  } catch (error) {
    console.error("productModelLoad error:", error);
    return { success: false };
  }
};

export const variantDataLoad = async (filter = {}) => {
  try {
    // convert productId string to ObjectId if present
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

export const adminProductsAddLogic = async (productName, category, description, isActive, variants) => {
  try {
    const newProduct = new Product({
      name: productName,
      categoryId: category,
      description,
    });

    const savedProduct = await newProduct.save();

    const variantDocs = variants.map(v => ({
      productId: savedProduct._id,
      color: v.color,
      size: v.size,
      SKU: v.sku,
      stock: v.stock,
      price: v.price,
      discount: v.discount,
      images: v.images,
      isActive: true,
    }));

    const savedVariants = await Variant.insertMany(variantDocs);

    
    savedProduct.variants = savedVariants.map(v => v._id);
    await savedProduct.save();

    return { success: true };
  } catch (error) {
    console.error("Error in adminProductsAddLogic:", error);
    return { success: false, message: "Error creating product" };
  }
};

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


export const updatedProducts=async({productId,name,categoryId,description})=>{

  try {

    const updated= await Product.findByIdAndUpdate(productId,{name,categoryId,description},{ returnDocument: 'after', runValidators: true }
)

    if(!updated){
      return {success:false,message:"product not found"}
    }
    return {success:true,data:updated}
    
  } catch (error) {
    console.log("updated products error",error);
    return ({success:false,message:error.message})
  }

}

export const upsertVariant = async ({ productId, variantId, variantData }) => {
  try {
    let variant;

    if (variantId) {
      const update = { ...variantData };

      
      if (!update.images || update.images.length === 0) {
        delete update.images;
      }

      variant = await Variant.findOneAndUpdate(
        { _id: variantId, productId },
        { $set: update },         
        { returnDocument: "after", runValidators: true }
      );

      if (!variant) {
        return { success: false, message: `Variant ${variantId} not found` };
      }
    } else {
      variant = await Variant.create({ productId, ...variantData });
    }

    return { success: true, data: variant };
  } catch (error) {
    console.error("upsertVariant error:", error);
    return { success: false, message: error.message };
  }
};

export const updateVariantStatuses = async (productId, changes) => {
  const ops = changes.map(({ variantId, isActive }) => ({
    updateOne: {
      filter: { _id: variantId },
      update: { $set: { isActive } }
    }
  }));

  const result = await Variant.bulkWrite(ops);
  return result;
};