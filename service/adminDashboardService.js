// adminDashboardService.js
// Provides data for the admin dashboard: chart data, top products, top categories.

import orderModel from "../model/orderModel.js";
import productsModel from "../model/productsModel.js";
import categoryModel from "../model/categoryModel.js";
import mongoose from "mongoose";


const generateChartData = (filter) => {
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const data = months.map((m) => ({ label: m, value: Math.floor(Math.random() * 10000) + 5000 }));
  return data;
};

const getTopProducts = async (limit = 10) => {
  // Aggregate order items to sum quantity per productName
  const pipeline = [
    { $unwind: "$orderItems" },
    {
      $group: {
        _id: "$orderItems.productName",
        totalSold: { $sum: "$orderItems.quantity" },
        revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        name: "$_id",
        totalSold: 1,
        revenue: 1,
      },
    },
  ];
  const result = await orderModel.aggregate(pipeline);
  return result;
};

// Get top N categories by total sales (using product's category reference)
const getTopCategories = async (limit = 10) => {
  const pipeline = [
    { $unwind: "$orderItems" },
    {
      $lookup: {
        from: "products", // collection name
        localField: "orderItems.productName",
        foreignField: "productName",
        as: "productInfo",
      },
    },
    { $unwind: "$productInfo" },
    {
      $lookup: {
        from: "categories",
        localField: "productInfo.category",
        foreignField: "_id",
        as: "categoryInfo",
      },
    },
    { $unwind: "$categoryInfo" },
    {
      $group: {
        _id: "$categoryInfo.name",
        totalSales: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
      },
    },
    { $sort: { totalSales: -1 } },
    { $limit: limit },
    { $project: { _id: 0, name: "$_id", totalSales: 1 } },
  ];
  const result = await orderModel.aggregate(pipeline);
  return result;
};

export const getDashboardData = async (filter = "yearly") => {
  const chartData = generateChartData(filter);
  const topProducts = await getTopProducts(10);
  const topCategories = await getTopCategories(10);
  return { chartData, topProducts, topCategories };
};
