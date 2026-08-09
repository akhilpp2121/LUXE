import dayjs from "dayjs";
import Order from "../model/orderModel.js";
import { getRangeConfig } from "../config/range_config.js";

const NOT_RETURNED = { $expr: { $eq: [{ $size: "$returnedAt" }, 0] } };
const IS_RETURNED = { $expr: { $gt: [{ $size: "$returnedAt" }, 0] } };

const buildEmptyBuckets = (config) => {
  const buckets = new Map();
  let cursor = dayjs(config.start);

  for (let i = 0; i < config.bucketCount; i++) {
    buckets.set(formatBucketKey(cursor, config.stepUnit), 0);
    cursor = cursor.add(1, config.stepUnit);
  }

  return buckets;
};

const formatBucketKey = (date, stepUnit) => {
  if (stepUnit === "day") return date.format("YYYY-MM-DD");
  if (stepUnit === "month") return date.format("YYYY-MM");
  return date.format("YYYY");
};

const formatBucketLabel = (key, stepUnit) => {
  if (stepUnit === "day") return dayjs(key).format("ddd D MMM");
  if (stepUnit === "month") return dayjs(`${key}-01`).format("MMM YYYY");
  return key;
};

export const chartData = async (filter = "yearly") => {
  try {
    const config = getRangeConfig(filter);

    const [orders, totalsAgg] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            orderStatus: "completed",
            createdAt: { $gte: config.start },
            ...NOT_RETURNED,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: config.dateFormat, date: "$createdAt" },
            },
            total: { $sum: "$totalAmount" },
          },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            orderStatus: "completed",
            createdAt: { $gte: config.start },
            ...NOT_RETURNED,
          },
        },
        { $unwind: "$orderItems" },
        {
          $group: {
            _id: null,
            fullRevenue: { $sum: "$orderItems.totalPrice" },
            totalOrders: { $sum: "$orderItems.quantity" },
          },
        },
      ]),
    ]);

    const buckets = buildEmptyBuckets(config);
    orders.forEach((row) => buckets.set(row._id, row.total));

    const labels = [];
    const values = [];
    for (const [key, value] of buckets) {
      labels.push(formatBucketLabel(key, config.stepUnit));
      values.push(value);
    }

    const totals = totalsAgg[0] || { fullRevenue: 0, totalOrders: 0 };

    return {
      success: true,
      filter,
      fullRevenue: totals.fullRevenue,
      totalOrders: totals.totalOrders,
      data: { labels, values },
    };
  } catch (e) {
    console.log(e);
    return { success: false, message: "Server error" };
  }
};




export const topSellingProduct = async () => {
  try {
    const match = {
      orderStatus: "completed",
      ...NOT_RETURNED,
    };

    const [products, categories] = await Promise.all([
      Order.aggregate([
        { $match: match },
        { $unwind: "$orderItems" },
        {
          $group: {
            _id: "$orderItems.variantId",
            name: { $first: "$orderItems.productName" },
            unitsSold: { $sum: "$orderItems.quantity" },
            revenue: { $sum: "$orderItems.totalPrice" },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 10 },
      ]),

      Order.aggregate([
        { $match: match },
        { $unwind: "$orderItems" },
        {
          $lookup: {
            from: "variants",
            localField: "orderItems.variantId",
            foreignField: "_id",
            as: "variantInfo",
          },
        },

        { $unwind: { path: "$variantInfo", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "products",
            localField: "variantInfo.productId",
            foreignField: "_id",
            as: "productInfo",
          },
        },

        { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$productInfo.categoryId",
            unitsSold: { $sum: "$orderItems.quantity" },
            revenue: { $sum: "$orderItems.totalPrice" },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        {
          $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      success: true,
      product: products.map((p) => ({
        name: p.name,
        unitsSold: p.unitsSold,
        revenue: p.revenue,
      })),
      category: categories.map((c) => ({
        name: c.categoryInfo?.categoryName || "Uncategorized",
        unitsSold: c.unitsSold,
        revenue: c.revenue,
      })),
    };
  } catch (e) {
    console.log(e);
    return {
      success: false,
      message: "Server error",
      product: [],
      category: [],
    };
  }
};

export const ledgerBook = async () => {
  try {
    const now = new Date();
    const start = dayjs().subtract(29, "day").startOf("day").toDate();

    const [credits, debits] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: now },
            orderStatus: "completed",
            ...NOT_RETURNED,
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$totalAmount" },
          },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            "returnedAt.0": { $exists: true },
          },
        },
        { $unwind: "$returnedAt" },
        {
          $match: {
            "returnedAt.returnRequestStatus": "Approved",
            "returnedAt.requestedAt": { $gte: start, $lte: now },
          },
        },
        {
          // pull the matching order item to get its price
          $addFields: {
            matchedItem: {
              $first: {
                $filter: {
                  input: "$orderItems",
                  as: "item",
                  cond: { $eq: ["$$item.variantId", "$returnedAt.variant"] },
                },
              },
            },
          },
        },
        {
          $addFields: {
            returnAmount: {
              $multiply: [
                { $ifNull: ["$matchedItem.price", 0] },
                { $ifNull: ["$returnedAt.quantity", 0] },
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$returnedAt.requestedAt",
              },
            },
            total: { $sum: "$returnAmount" },
          },
        },
      ]),
    ]);

    const creditMap = new Map(credits.map((c) => [c._id, c.total]));
    const debitMap = new Map(debits.map((d) => [d._id, d.total]));

    let balance = 0;
    const ledger = [];

    for (let i = 29; i >= 0; i--) {
      const date = dayjs(now).subtract(i, "day");
      const key = date.format("YYYY-MM-DD");

      const credit = creditMap.get(key) || 0;
      const debit = debitMap.get(key) || 0;

      balance += credit - debit;

      ledger.push({
        date: date.format("DD MMM"),
        credit,
        debit,
        runningBalance: balance,
      });
    }

    return { success: true, ledger: ledger.reverse() };
  } catch (e) {
    console.log(e);
    return { success: false, message: "Server error", ledger: [] };
  }
};

export const getDashboardData = async (filter = "yearly") => {
  const validFilters = ["yearly", "monthly", "weekly"];
  const safeFilter = validFilters.includes(filter) ? filter : "yearly";

  const [chart, topSelling, ledger] = await Promise.all([
    chartData(safeFilter),
    topSellingProduct(),
    ledgerBook(),
  ]);

  return {
    filter: safeFilter,
    chartData: chart,
    topProducts: topSelling.success ? topSelling.product : [],
    topCategories: topSelling.success ? topSelling.category : [],
    ledger: ledger.success ? ledger.ledger : [],
  };
};
