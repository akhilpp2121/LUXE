

import categoryModel from "../model/categoryModel.js";
import Product from "../model/productsModel.js";
import Offer from "../model/offerModel.js";
import { applyOffersToProduct ,} from "../service/productsService.js";
import {
    adminCategoryAddLogic,
    categoryModelLoad,
    categoryDataLoad,
    adminCategoryEditLogic,
    categoryFindOne

} from "../service/categoryService.js";
import { resolveBestOffer } from "../service/adminOfferService.js";
export const adminCategoryLoad = async (req, res) => {
   try {

    const searchQuery = req.query.search?.trim() || "";
    const status = req.query.status;
    const sort = req.query.sort;

    const filter = {};

    let sortOption = { createdAt: -1 };
   

    if (searchQuery) {
        filter.categoryName = { $regex: searchQuery, $options: "i" };
    }

    if (status === "true")       filter.isActive = true;
    else if (status === "false") filter.isActive = false;

    if (sort === "oldest") sortOption = { createdAt: 1 };

    

    

    const data = await categoryModelLoad(filter, sortOption, req.query.page);

    // Fetch active CATEGORY offers for dropdown
    const offers = await Offer.find({ isActive: true, type: "CATEGORY", endDate: { $gte: new Date() } }).select('_id name discountType discountValue maxDiscount');

    // For each category, fetch its products and their variants to list them
    const populatedCategories = await Promise.all(data.data.map(async (cat) => {
        const products = await Product.find({ categoryId: cat._id }).populate("variants").populate("offer").lean();
        return {
            ...cat.toObject(),
            products
        };
    }));

    return res.render("Admin/categoryPage", {
        data:        populatedCategories,
        error:       "",
        status:      req.query.status || "",
        search:      req.query.search || "",
        sort:        req.query.sort   || "latest",
        currentPage: data.currentPage,
        totalCount:  data.totalCount,
        totalPage:   data.totalPages,
        activePage:  "category",
        offers, // category offers
    });

   } catch (error) {
    console.log(error); 

    return res.render("Admin/categoryPage", {
        error: "Something went wrong",
        data: [],
        totalCount: 0,
        totalPage: 0,
        currentPage: 1,
        offers: [],
    });
   }
};

// export const adminCategoryOfferAdd = async (req, res) => {
//   try {
//     const { categoryId, offerId } = req.body;
//     if (!categoryId) {
//       return res.status(400).json({ success: false, message: "categoryId is required" });
//     }

//     // Save offer on category
//     await categoryModel.findByIdAndUpdate(categoryId, {
//       offer: offerId || null,
//     });

//     // Find all products in this category (with variants + their own offer)
//     const products = await Product.find({ categoryId })
//       .populate("variants")
//       .populate("offer")
//       .lean();

//     for (const product of products) {
//       const bestOffer = await resolveBestOffer(product);

//       // Write the best offer back onto the product before recalculating
//       await Product.findByIdAndUpdate(product._id, {
//         appliedOffer: bestOffer?._id || null,
//       });

//       await applyOffersToProduct(product._id, bestOffer);
//     }

//     return res.json({
//       success: true,
//       message: "Best offer applied to category products successfully",
//     });
//   } catch (error) {
//     console.error("adminCategoryOfferAdd error:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

export const adminCategoryOfferAdd = async (req, res) => {
  try {
    const { categoryId, offerId } = req.body;
    if (!categoryId) {
      return res.status(400).json({ success: false, message: "categoryId is required" });
    }

    // Save offer on category first
    await categoryModel.findByIdAndUpdate(categoryId, {
      offer: offerId || null,
    });

    // Fetch products AFTER category update — so categoryId.offer is fresh
    const products = await Product.find({ categoryId }).select("_id");

    // Just pass productId — applyOffersToProduct fetches everything fresh itself
    for (const product of products) {
      await applyOffersToProduct(product._id);
    }

    return res.json({
      success: true,
      message: offerId ? "Offer applied to category products successfully" : "Offer removed successfully",
    });

  } catch (error) {
    console.error("adminCategoryOfferAdd error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



export const addCategoryPageLoad = async (req, res) => {
    try {
        return res.render("Admin/addCategory", { error: "", activePage: "category" });
    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
};

export const editCategoryPageLoad = async (req, res) => {
    const id = req.params.id;
    const result = await categoryFindOne({ _id: id });
    
    
    if (!result.success) return res.send(result.message);
    const category = result.data;
    res.render("Admin/editCategory", {
        activePage:  "category",
        error:       "",
        id:          category._id,
        name:        category.categoryName,
        description: category.description,
        status:      category.isActive,
    });
};

export const adminCategoryAdd = async (req, res) => {
    try {


        const { categoryName, description, status } = req.body;
        
        if (!categoryName || !description) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const isActive = status === "active";   
        
        const result = await adminCategoryAddLogic(categoryName, description, isActive);
        
        if (!result.success) {
            return res.status(409).json({ success: false, message: result.message });
        }

        return res.json({ success: true, redirect: "/admin/category" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};





export const adminCategoryEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const { category_name, description, status } = req.body;

        if (!category_name || !description) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const isActive = status === "active";

        const result = await adminCategoryEditLogic(id, category_name, description, isActive);

        if (!result.success) {
            return res.status(409).json({ success: false, message: result.message });
        }

        return res.json({ success: true, redirect: "/admin/category" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

