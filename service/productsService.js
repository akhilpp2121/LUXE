
import mongoose from "mongoose";
import category from "../model/categoryModel.js";
import Product from "../model/productsModel.js";
import Variant from "../model/variantModel.js";

export const productModelLoad = async (filter, sort, pageNo) => {
  try {
    const page = parseInt(pageNo) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const products = await Product.find(filter)
      .populate("categoryId")
      .populate("variants")
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
export async function generateUniqueSKU(productName, color, size, index = 1) {
  
  const nameCode = (productName || 'PRD')
    .trim()
    .split(/\s+/)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 4);

  const colorCode = (color || 'CLR')
    .replace(/\s+/g, '')
    .slice(0, 3)
    .toUpperCase();

  const sizeMap = { Small: 'S', Medium: 'M', Large: 'L', XL: 'XL', XXL: 'XXL' };
  const sizeCode = sizeMap[size] || (size || 'SZ').slice(0, 2).toUpperCase();

  const prefix = `${nameCode}-`;
  const existing = await Variant.find(
    { SKU: { $regex: `^${prefix}` } },
    { SKU: 1 }
  );

  let maxSeq = 0;
  existing.forEach(v => {
    const parts = v.SKU?.split('-');
    if (parts && parts[1]) {
      const n = parseInt(parts[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });

  let seq = maxSeq + index;
  let sku, collision;
  do {
    sku = `${nameCode}-${String(seq).padStart(3, '0')}-${colorCode}-${sizeCode}`;
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




// 

export const upsertVariant = async ({ productId, variantId, variantData }) => {
  try {
    const { isActive, ...safeData } = variantData;

    // ── Duplicate check: same product + same color (case-insensitive) + same size ──
    const duplicateQuery = {
      productId,
      color: { $regex: new RegExp(`^${safeData.color}$`, "i") },
      size: safeData.size,
    };
    if (variantId) {
      // Exclude the current variant from the check (it's allowed to keep its own color+size)
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
        { new: true }
      );
      if (!updated) return { success: false, message: "Variant not found" };
      return { success: true, data: updated };
    } else {
      // const created = await Variant.create({ ...safeData, productId, isActive: true });
      // return { success: true, data: created };
     const created = await Variant.create({ ...safeData, productId, isActive: true });
  //  push new variant _id into product's variants array
  await Product.findByIdAndUpdate(productId, { $push: { variants: created._id } });
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
      update: { $set: { isActive } }
    }
  }));

  const result = await Variant.bulkWrite(ops);
  return result;
};