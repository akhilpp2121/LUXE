

import {
    adminCategoryAddLogic,
    categoryModelLoad,
    categoryDataLoad,
    adminCategoryEditLogic,
    categoryFindOne

} from "../service/categoryService.js";

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

    return res.render("Admin/categoryPage", {
        data:        data.data,
        error:       "",
        status:      req.query.status || "",
        search:      req.query.search || "",
        sort:        req.query.sort   || "latest",
        currentPage: data.currentPage,
        totalCount:  data.totalCount,
        totalPage:   data.totalPages,
        activePage:  "category",
    });

   } catch (error) {
    console.log(error); 

    return res.render("Admin/categoryPage", {
        error: "Something went wrong",
        data: [],
        totalCount: 0,
        totalPage: 0,
        currentPage: 1
    });
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