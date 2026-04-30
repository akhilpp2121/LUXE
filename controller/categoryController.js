import categoryModel from "../model/categoryModel.js";

// 

export const adminCategoryLoad = async (req, res) => {
    try {console.log("hit");
    
        if (req.session.admin) {
            return res.redirect("/admin/dashboard");
        }

        return res.render("Admin/categoryPage"); 
    } catch (error) {
        console.error("Error loading admin login:", error);
        return res.status(500).send("Server Error");
    }
};