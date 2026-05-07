

import {
    adminCategoryAddLogic,
    categoryModelLoad,
    categoryDataLoad,
    adminCategoryDeleteLogic,
    adminCategoryEditLogic

} from "../service/categoryService.js";

export const adminCategoryLoad = async (req, res) => {
    let filter = {};
    let sortOption = { createdAt: -1 };

    if (req.query.status === "true")       filter.isActive = true;
    else if (req.query.status === "false") filter.isActive = false;

    if (req.query.search && req.query.search.trim() !== "") {
        filter.$or = [
            { categoryName: { $regex: req.query.search, $options: "i" } }
        ];
    }

    if (req.query.sort === "oldest") sortOption = { createdAt: 1 };

    const data = await categoryModelLoad(filter, sortOption, req.query.page);

    return res.render("Admin/categoryPage", {
        data:        data.data,
        error:       "",
        status:      req.query.status || "",   // ← fixed: was String(filter.isActive)
        search:      req.query.search  || "",
        sort:        req.query.sort    || "latest",
        currentPage: data.currentPage,
        totalUser:   data.totalUser,
        totalPage:   data.totalPages,
        activePage:  "category",
    });
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
    const result = await categoryDataLoad({ _id: id });
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
        console.log("req.body →", req.body);   // ← add this temporarily to confirm body arrives

        const { categoryName, description, status } = req.body;

        if (!categoryName || !description) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const isActive = status === "active";   // ← convert string to boolean

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


export const adminCategoryDelete = async (req, res) => {
    try {
        const { id } = req.params;
     await adminCategoryDeleteLogic(id)
        return res.json({ success: true });
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