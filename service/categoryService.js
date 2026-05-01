import categoryModel from "../model/categoryModel.js"

export const categoryModelLoad = async (filter, sort, pageNo) => {
    const page = parseInt(pageNo) || 1
    const limit = 5
    const skip = (page - 1) * limit

    const total = await categoryModel.countDocuments()
    const totalPages = Math.ceil(total / limit)

    let tempCategoryProgress = await categoryModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)

    if (!tempCategoryProgress) {
        return { success: false, message: "ERROR WHILE LOADING DATA" }
    }

    return {
        success: true,
        data: tempCategoryProgress,
        currentPage: page,
        totalPages: totalPages,
        totalUser: total
    }
}
