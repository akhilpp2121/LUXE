import categoryModel from "../model/categoryModel.js";

export const categoryModelLoad = async (filter, sort, pageNo) => {
  const page = parseInt(pageNo) || 1;
  const limit = 4;
  const skip = (page - 1) * limit;

  const total = await categoryModel.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  const data = await categoryModel
    .find(filter)
    .populate("offer")
    .sort(sort)
    .skip(skip)
    .limit(limit);

  return {
    success: true,
    data,
    currentPage: page,
    totalPages,
    totalCount: total,
  };
};

export const categoryDataLoad = async (filter) => {
  try {
    const data = await categoryModel.find(filter);
    return { success: true, data };
  } catch (error) {
    return { success: false, message: "Database error", data: [] };
  }
};

export const categoryFindOne = async (filter) => {
  try {
    const data = await categoryModel.findOne(filter);
    if (!data) return { success: false, message: "Category not found" };
    return { success: true, data };
  } catch (error) {
    return { success: false, message: "Database error" };
  }
};

export const adminCategoryAddLogic = async (
  categoryName,
  description,
  isActive,
) => {
  try {
    const existing = await categoryModel.findOne({
      categoryName: { $regex: `^${categoryName}$`, $options: "i" },
    });

    if (existing) {
      return { success: false, message: "Category already exists" };
    }

    const newCategory = new categoryModel({
      categoryName,
      description,
      isActive,
    });
    const saved = await newCategory.save();

    return { success: true };
  } catch (error) {
    console.log("DB ERROR:", error.message);
    return { success: false, message: "Database error" };
  }
};

export const adminCategoryEditLogic = async (
  id,
  categoryName,
  description,
  isActive,
) => {
  try {
    const existing = await categoryModel.findOne({
      categoryName: { $regex: `^${categoryName}$`, $options: "i" },
      _id: { $ne: id },
    });

    if (existing) {
      return { success: false, message: "Category name already exists" };
    }

    const updated = await categoryModel.findByIdAndUpdate(
      id,
      { categoryName, description, isActive },
      { returnDocument: "after" },
    );

    if (!updated) return { success: false, message: "Category not found" };

    return { success: true };
  } catch (error) {
    console.log("DB ERROR:", error.message);
    return { success: false, message: "Database error" };
  }
};
