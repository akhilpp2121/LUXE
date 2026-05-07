


import categoryModel from "../model/categoryModel.js";

export const categoryModelLoad = async (filter, sort, pageNo) => {
    const page  = parseInt(pageNo) || 1;
    const limit = 5;
    const skip  = (page - 1) * limit;

    const total      = await categoryModel.countDocuments(filter);  // ← pass filter
    const totalPages = Math.ceil(total / limit);

    const data = await categoryModel.find(filter).sort(sort).skip(skip).limit(limit);

    return { success: true, data, currentPage: page, totalPages, totalUser: total };
};

export const categoryDataLoad = async (filter) => {
    try {
        const data = await categoryModel.findOne(filter);
        if (!data) return { success: false, message: "Category not found" };
        return { success: true, data };
    } catch (error) {
        return { success: false, message: "Database error" };
    }
};

export const adminCategoryAddLogic = async (categoryName, description, isActive) => {
    try {
        console.log("checking for existing:", categoryName);
        
        const existing = await categoryModel.findOne({
            categoryName: { $regex: `^${categoryName}$`, $options: "i" }
        });

        console.log("existing found:", existing);

        if (existing) {
            return { success: false, message: "Category already exists" };
        }

        const newCategory = new categoryModel({ categoryName, description, isActive });
        const saved = await newCategory.save();
        console.log("saved:", saved);

        return { success: true };
    } catch (error) {
        console.log("DB ERROR:", error.message);   // ← this will reveal the real problem
        return { success: false, message: "Database error" };
    }
};


export const adminCategoryDeleteLogic = async (id) => {
    try {
        const deleted = await categoryModel.findByIdAndDelete(id);
        if (!deleted) return { success: false, message: "Category not found" };
        return { success: true };
    } catch (error) {
        console.log("DB ERROR:", error.message);
        return { success: false, message: "Database error" };
    }
};
export const adminCategoryEditLogic = async (id, categoryName, description, isActive) => {
    try {
        // Check for duplicate name, excluding the current category
        const existing = await categoryModel.findOne({
            categoryName: { $regex: `^${categoryName}$`, $options: "i" },
            _id: { $ne: id }
        });

        if (existing) {
            return { success: false, message: "Category name already exists" };
        }

        const updated = await categoryModel.findByIdAndUpdate(
            id,
            { categoryName, description, isActive },
                { returnDocument: 'after' }

        );

        if (!updated) return { success: false, message: "Category not found" };

        return { success: true };
    } catch (error) {
        console.log("DB ERROR:", error.message);
        return { success: false, message: "Database error" };
    }
};