// import categoryModel from "../model/categoryModel.js";



// export const adminCategoryLoad = async (req,res)=>{

//     let filter = {}  
//     let sortOption = { createdAt: -1 };  

//     if(req.query.status == "true"){
//         filter.isActive = true
//     }else if(req.query.status == "false"){
//         filter.isActive = false
//     }
//     if (req.query.search&&req.query.search.trim()!=="") {
//         filter.$or = [
//             { categoryName: { $regex: req.query.search, $options: "i" } }
            
//         ];
//     }

//     let status = String(filter.isActive)
    
//     if (req.query.sort === "oldest") {
//         sortOption = { createdAt: 1 };
//     }
//     let data = await categoryModelLoad(filter,sortOption,req.query.page)
//     let offer = await offerDataLoad()
//     return res.render('Admin/categories-page',{

//         data:data.data,
//         error:'',
//         status:status,
//         search:req.query.search || "",
//         sort: req.query.sort || "latest",
//         currentPage:data.currentPage,
//         totalUser:data.totalUser,
//         totalPage:data.totalPages,
//         activePage:'category',
//         offer:offer.data
//     })
// }