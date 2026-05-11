               




import {
  productModelLoad,
  variantDataLoad,
  adminProductsAddLogic,
  productFindById,
  updatedProducts,
  upsertVariant, 
  updateVariantStatuses       
} from "../service/productsService.js";
import { categoryDataLoad } from "../service/categoryService.js";
import Variant from "../model/variantModel.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/products
// ─────────────────────────────────────────────────────────────────────────────
export const adminProductPageLoad = async (req, res) => {
  let filter = {};
  let sortOption = { createdAt: -1 };

  const categoryResult = await categoryDataLoad({ isActive: true });
  const categories = categoryResult.success ? categoryResult.data : [];

  if (req.query.search && req.query.search.trim() !== "") {
    filter.$or = [{ name: { $regex: req.query.search, $options: "i" } }];
  }
  if (req.query.sort === "oldest") sortOption = { createdAt: 1 };

  let products = await productModelLoad(filter, sortOption, req.query.page);

  if (!products.success) {
    return res.render("Admin/productPage", {
      error: "ERROR WHILE LOADING",
      data: [],
      categories: [],
      sort: req.query.sort || "latest",
      currentPage: 1,
      totalUser: 0,
      totalPage: 1,
      searchQuery: req.query.search || "",
      activePage: "products",
    });
  }

  return res.render("Admin/productPage", {
    error: "",
    data: products.data,
    categories,
    sort: req.query.sort || "latest",
    currentPage: products.currentPage,
    totalUser: products.totalUser,
    totalPage: products.totalPages,
    searchQuery: req.query.search || "",
    activePage: "products",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/product-add
// ─────────────────────────────────────────────────────────────────────────────
export const adminProductsAdd = async (req, res) => {
  try {
    let { productName, category, description } = req.body;
    const isActive= true;
    const variants = {};

    for (let key in req.body) {
      const match = key.match(/^variants\[(\d+)\]\.(.+)$/);
      if (match) {
        const index = Number(match[1]);
        const field = match[2];
        if (!variants[index]) variants[index] = {};
        variants[index][field] = req.body[key];
      }
    }

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

    const finalVariants = Object.values(variants).map((v) => ({
      color: v.color?.trim(),
      size: v.size?.trim(),
      sku: v.sku?.trim(),
      stock: Number(v.stock),
      price: Number(v.price),
      discount: v.discount ? Number(v.discount) : 0,
      images: v.images || [],
      isActive:true
    }));

    if (!productName || productName.trim().length < 3)
      return res.status(400).json({ success: false, message: "Product name must be at least 3 characters" });
    if (!category || category === "select category")
      return res.status(400).json({ success: false, message: "Please select a valid category" });
    if (!finalVariants.length)
      return res.status(400).json({ success: false, message: "At least one variant is required" });

    for (let v of finalVariants) {
      if (!v.color || !v.size || !v.sku)
        return res.status(400).json({ success: false, message: "Color, Size and SKU are required" });
      if (isNaN(v.price) || v.price <= 0)
        return res.status(400).json({ success: false, message: "Invalid price" });
      if (isNaN(v.stock) || v.stock < 0)
        return res.status(400).json({ success: false, message: "Invalid stock value" });
      if (v.images.length < 3)
        return res.status(400).json({ success: false, message: "Each variant must have at least 3 images" });
    }

    const result = await adminProductsAddLogic(productName.trim(), category, description?.trim(), isActive, finalVariants);
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

    // ── Group uploaded images by variant index ────────────────────────────────
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
        isActive:v.isActive==="true"
      };

      
let existingImages = req.body[`variants[${i}].existingImages`];
if (!existingImages) existingImages = [];
else if (!Array.isArray(existingImages)) existingImages = [existingImages];
// Filter out empty strings (slots that were replaced by a new upload)
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
