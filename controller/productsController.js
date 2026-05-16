               




import {
  productModelLoad,
  variantDataLoad,
  adminProductsAddLogic,
  productFindById,
  updatedProducts,
  upsertVariant, 
  updateVariantStatuses    ,
  generateUniqueSKU   
} from "../service/productsService.js";
import { categoryDataLoad } from "../service/categoryService.js";
import Variant from "../model/variantModel.js";



export const adminProductPageLoad = async (req, res) => {
  const searchQuery = req.query.search?.trim() || "";
  const sort        = req.query.sort || "latest";
  const sortOption  = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

  // Build filter
  const filter = {};
  if (searchQuery) {
    filter.$or = [{ name: { $regex: searchQuery, $options: "i" } }];
  }

  const categoryResult = await categoryDataLoad({ isActive: true });
  const categories = categoryResult.success ? categoryResult.data : [];

  const products = await productModelLoad(filter, sortOption, req.query.page);

 

  const commonData = {
    categories,
    sort,
    searchQuery,
    activePage: "products",
  };

  if (!products.success) {
    return res.render("Admin/productPage", {
      ...commonData,
      error: "ERROR WHILE LOADING",
      data: [],
      currentPage: 1,
      totalUser: 0,
      totalPage: 1,
    });
  }

  return res.render("Admin/productPage", {
    ...commonData,
    error: "",
    data: products.data,
    currentPage: products.currentPage,
    totalUser: products.totalUser,
    totalPage: products.totalPages,
  });
};




// // ─────────────────────────────────────────────────────────────────────────────
// GET /admin/product-add
// ─────────────────────────────────────────────────────────────────────────────
export const addProductPageLoad = async (req, res) => {
  let data = await categoryDataLoad({ isActive: true });
  if (!data.success) {
    return res.render("Admin/addProducts", { error: data.message, activePage: "products" });
  }
  return res.render("Admin/addProducts", { category: data.data, error: "", activePage: "products" });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/product-edit/:id
// ─────────────────────────────────────────────────────────────────────────────
export const editProductPageLoad = async (req, res) => {
  const productId = req.params.id;

  const productResult = await productFindById(productId);
  if (!productResult.success) return res.redirect("/admin/products");

  const variants = await variantDataLoad({ productId });
  const category = await categoryDataLoad({ isActive: true });

  const product = productResult.data.toObject();
  product.variants = variants.data;

  return res.render("Admin/editProducts", {
    error: "",
    product,
    category: category.data,
    activePage: "products",
  });
};




export const adminProductsAdd = async (req, res) => {
  try {
    let { productName, category, description } = req.body;
    const isActive = true;
    const variants = {};

    // ── Parse body ──
    for (let key in req.body) {
      const match = key.match(/^variants\[(\d+)\]\.(.+)$/);
      if (match) {
        const index = Number(match[1]);
        const field = match[2];
        if (!variants[index]) variants[index] = {};
        variants[index][field] = req.body[key];
      }
    }

    // ── Parse files ──
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const match = file.fieldname.match(/^variants\[(\d+)\]\.images$/);
        if (match) {
          const index = Number(match[1]);
          if (!variants[index]) variants[index] = {};
          if (!variants[index].images) variants[index].images = [];
          variants[index].images.push(
            file.path.replace(/\\/g, "/").replace(/^.*uploads\//, "")
          );
        }
      });
    }

    // ── VALIDATE FIRST (before any async SKU generation) ──
    if (!productName || productName.trim().length < 3)
      return res.status(400).json({ success: false, message: "Product name must be at least 3 characters" });
    if (!category || category === "select category")
      return res.status(400).json({ success: false, message: "Please select a valid category" });

    const rawVariants = Object.values(variants);
    if (!rawVariants.length)
      return res.status(400).json({ success: false, message: "At least one variant is required" });

    
    for (let v of rawVariants) {
      if (!v.color?.trim() || !v.size?.trim())
        return res.status(400).json({ success: false, message: "Color and Size are required for every variant" });
      if (isNaN(Number(v.price)) || Number(v.price) <= 0)
        return res.status(400).json({ success: false, message: "Invalid price" });
      if (isNaN(Number(v.stock)) || Number(v.stock) < 0)
        return res.status(400).json({ success: false, message: "Invalid stock value" });
      if (!v.images || v.images.length < 3)
        return res.status(400).json({ success: false, message: "Each variant needs at least 3 images" });
    }

    const addKeys = rawVariants.map(v => `${v.color.trim().toLowerCase()}|${v.size.trim().toLowerCase()}`);
    if (addKeys.length !== new Set(addKeys).size)
      return res.status(400).json({ success: false, message: "Two or more variants have the same color and size" });


    
    const finalVariants = await Promise.all(
      rawVariants.map(async (v, i) => {
        const sku = await generateUniqueSKU(
          productName.trim(),
          v.color,
          v.size,
          i + 1
        );
        return {
          color:    v.color.trim(),
          size:     v.size.trim(),
          sku,
          stock:    Number(v.stock),
          price:    Number(v.price),
          discount: v.discount ? Number(v.discount) : 0,
          images:   v.images,
          isActive: true,
        };
      })
    );

    const result = await adminProductsAddLogic(
      productName.trim(), category, description?.trim(), isActive, finalVariants
    );
    if (!result.success) return res.status(400).json(result);

    return res.status(200).json({ success: true, message: "Product added successfully", redirect: "/admin/products" });

  } catch (error) {
    console.error("Add Product Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /admin/product-edit/:id
export const adminProductsEdit = async (req, res) => {
  try {
    const productId = req.params.id;
    const { productName, category, description } = req.body;

    if (!productName || productName.trim().length < 3)
      return res.status(400).json({ success: false, message: "Product name must be at least 3 characters" });
    if (!category)
      return res.status(400).json({ success: false, message: "Category is required" });
    if (!description || description.trim().length < 5)
      return res.status(400).json({ success: false, message: "Description must be at least 5 characters" });

    const editData = await updatedProducts({
      productId,
      name: productName.trim(),
      categoryId: category,
      description: description.trim(),
    });
    if (!editData.success)
      return res.status(400).json({ success: false, message: editData.message });

    
    const variantsMap = {};
    for (let key in req.body) {
      const match = key.match(/^variants\[(\d+)\]\.(.+)$/);
      if (match) {
        const idx   = Number(match[1]);
        const field = match[2];
        if (!variantsMap[idx]) variantsMap[idx] = {};
        variantsMap[idx][field] = req.body[key];
      }
    }
    const variantsArr = Object.values(variantsMap);
     const editKeys = variantsArr.map(v => `${v.color?.trim().toLowerCase()}|${v.size?.trim().toLowerCase()}`);
    if (editKeys.length !== new Set(editKeys).size)
      return res.status(400).json({ success: false, message: "Two or more variants have the same color and size" });


    const imagesByVariant = {};
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const match = file.fieldname.match(/variants\[(\d+)\]\.images/);
        if (match) {
          const idx = parseInt(match[1], 10);
          if (!imagesByVariant[idx]) imagesByVariant[idx] = [];
          // ── FIX: normalize path same way as add ──────────────────────────
          const normalized = file.path
            ? file.path.replace(/\\/g, "/").replace(/^.*uploads\//, "")
            : file.filename;
          imagesByVariant[idx].push(normalized);
        }
      });
    }

    const keepVariantIds = [];

    for (let i = 0; i < variantsArr.length; i++) {
      const v = variantsArr[i];

      if (!v.color || !v.color.trim())
        return res.status(400).json({ success: false, message: `Variant ${i + 1}: color is required` });
      if (!v.size)
        return res.status(400).json({ success: false, message: `Variant ${i + 1}: size is required` });
      if (v.stock === undefined || v.stock === "" || Number(v.stock) < 0)
        return res.status(400).json({ success: false, message: `Variant ${i + 1}: valid stock is required` });
      if (!v.price || Number(v.price) <= 0)
        return res.status(400).json({ success: false, message: `Variant ${i + 1}: valid price is required` });

      const variantData = {
        color:    v.color.trim(),
        size:     v.size,
        stock:    Number(v.stock),
        price:    Number(v.price),
        discount: v.discount ? Number(v.discount) : 0,
        SKU:      v.sku ? v.sku.trim() : "",
        
      };

      
let existingImages = req.body[`variants[${i}].existingImages`];
if (!existingImages) existingImages = [];
else if (!Array.isArray(existingImages)) existingImages = [existingImages];
existingImages = existingImages.filter(p => p && p.trim() !== '');

const newImages = imagesByVariant[i] || [];

const mergedImages = [...existingImages, ...newImages];
if (mergedImages.length > 0) {
  variantData.images = mergedImages;
}

      const result = await upsertVariant({
        productId,
        variantId: v.variantId || null,
        variantData,
      });
      if (!result.success)
        return res.status(400).json({ success: false, message: result.message });

      keepVariantIds.push(result.data._id.toString());
    }

    await Variant.deleteMany({ productId, _id: { $nin: keepVariantIds } });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      redirect: "/admin/products",
    });

  } catch (error) {
    console.error("adminProductsEdit error:", error);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
};



export const updateProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const { changes } = req.body;

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide at least one change' });
    }

    const validChanges = changes.filter(
      c => c.variantId && typeof c.isActive === 'boolean'
    );

    if (validChanges.length === 0) {
      return res.status(400).json({ success: false, message: 'Each change needs a variantId and boolean isActive' });
    }

    const result = await updateVariantStatuses(productId, validChanges);

    return res.json({
      success: true,
      message: `${result.modifiedCount} variant(s) updated`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('[updateProductStatus]', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
