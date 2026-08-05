
import {
  verifyAdminLogin,
  adminUsersLogic,
  adminUserEditLogic,
} from "../service/adminService.js";
import { getDashboardData } from "../service/salesReportService.js";
import {
  INVALID_CREDENTIALS,
  FAILED_TO_LOAD_USERS,
  FAILED_TO_UPDATE_USER,
  SOMETHING_WENT_WRONG,
} from "../constants/serverMessages.js";

export const adminLoginLoad = async (req, res, next) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin/dashboard");
    }
    return res.render("Admin/adminLogin");
  } catch (error) {
    console.error("Error loading admin login:", error);
    next(error);
  }
};

export const dashboardLoad = async (req, res, next) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }

    const filter = req.query.filter || "yearly";
    const dashboardData = await getDashboardData(filter);

    return res.render("Admin/dashboard", {
      chartData: dashboardData.chartData,
      topProducts: dashboardData.topProducts,
      topCategories: dashboardData.topCategories,
      ledger: dashboardData.ledger,
      filter: dashboardData.filter,
    });
  } catch (error) {
    console.error("Dashboard load error:", error);
    next(error);
  }
};

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const isValid = verifyAdminLogin(email, password);

    if (isValid) {
      req.session.admin = true;
      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
        return res.redirect("/admin/dashboard");
      });
    } else {
      return res.render("Admin/adminLogin", {
        message: INVALID_CREDENTIALS,
      });
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const userManagementPageLoad = async (req, res, next) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }

    const toast = req.session.toast || null;
    delete req.session.toast;

    let filter = {};
    if (req.query.status === "true") filter.isActive = true;
    if (req.query.status === "false") filter.isActive = false;

    if (req.query.search && req.query.search.trim() !== "") {
      filter.$or = [
        { fullName: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (req.query.sort === "oldest") sortOption = { createdAt: 1 };

    const result = await adminUsersLogic(filter, req.query.page, sortOption);

    if (!result.success) {
      return res.render("Admin/userManagement", {
        data: [],
        status: req.query.status || "",
        currentPage: 1,
        totalUser: 0,
        totalPage: 1,
        search: req.query.search || "",
        sort: req.query.sort || "latest",
        error: FAILED_TO_LOAD_USERS,
        activePage: "users",
        toast,
      });
    }

    return res.render("Admin/userManagement", {
      data: result.data,
      status: String(filter.isActive),
      currentPage: result.currentPage,
      totalUser: result.totalUser,
      totalPage: result.totalPages,
      search: req.query.search || "",
      sort: req.query.sort || "latest",
      error: "",
      activePage: "users",
      toast,
    });
  } catch (error) {
    console.error("Error loading user management page:", error);
    next(error);
  }
};

export const updateUserStatusController = async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  const { id, isActive } = req.body;

  try {
    const result = await adminUserEditLogic(isActive, id);
    const userName = result.user?.fullName || "User";

    req.session.toast = result.success
      ? {
          type: isActive === "true" ? "success" : "warning",
          msg: `${userName} has been ${isActive === "true" ? "activated" : "blocked"}`,
        }
      : { type: "error", msg: FAILED_TO_UPDATE_USER };
  } catch (err) {
    console.error(err);
    req.session.toast = { type: "error", msg: SOMETHING_WENT_WRONG };
  }

  res.redirect("/admin/users");
};

export const adminLogout = (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie("connect.sid", { path: "/" });
    return res.redirect("/admin/login");
  });
};
