import { verifyAdminLogin ,adminUsersLogic,adminUserEditLogic} from "../service/adminService.js";

export const adminLoginLoad = async (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect("/admin/dashboard");
        }

        return res.render("Admin/adminLogin"); 
    } catch (error) {
        console.error("Error loading admin login:", error);
        return res.status(500).send("Server Error");
    }
};


export const dashboardLoad = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect("/admin/login"); 
        }

        return res.render("Admin/dashboard");
    } catch (error) {
        console.error("Dashboard load error:", error);
        res.status(500).send("Server Error");
    }
};


export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);

    const isValid = verifyAdminLogin(email, password);
    console.log(isValid);

    if (isValid) {
      req.session.admin = true;
      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
        return res.redirect("/admin/dashboard");
      });
    } else {
      return res.render("Admin/adminLogin", {
        message: "Invalid credentials",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

export const userManagementPageLoad = async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect('/admin/login');
    }

    const toast = req.session.toast || null;
    delete req.session.toast;


    // Build filter
    let filter = {}
    if (req.query.status === "true")  filter.isActive = true
    if (req.query.status === "false") filter.isActive = false
    

    if (req.query.search && req.query.search.trim() !== "") {
  filter.$or = [
    { fullName: { $regex: req.query.search, $options: "i" } },
    { email:    { $regex: req.query.search, $options: "i" } }
  ];
}


    // Build sort
    let sortOption = { createdAt: -1 }
    if (req.query.sort === "oldest") sortOption = { createdAt: 1 }

    const result = await adminUsersLogic(filter, req.query.page, sortOption)

    if (!result.success) {
      return res.render('Admin/userManagement', {
        data: [],
        status: req.query.status || "",
        currentPage: 1,
        totalUser: 0,
        totalPage: 1,
        search: req.query.search || "",
        sort: req.query.sort || "latest",
        error: "Failed to load users",
        activePage: 'users',
        toast
      })
    }

    return res.render('Admin/userManagement', {
      data:        result.data,
      status:      String(filter.isActive),
      currentPage: result.currentPage,
      totalUser:   result.totalUser,
      totalPage:   result.totalPages,
      search:      req.query.search || "",
      sort:        req.query.sort || "latest",
      error:       '',
      activePage:  'users',
      toast
    })

  } catch (error) {
    console.error("Error loading user management page:", error);
    return res.status(500).send("Server Error");
  }
}

export const updateUserStatusController = async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }

  try {
    const { id, isActive } = req.body;

    const result = await adminUserEditLogic(isActive, id);

    if (!result.success) {
      req.session.toast = { type: 'error', msg: 'Failed to update user' };
      return res.redirect('/admin/users');
    }

    const userName = result.user?.fullName || 'User';

    req.session.toast = {
      type: isActive === 'true' ? 'success' : 'warning',
      msg: isActive === 'true'
        ? `${userName} has been activated`
        : `${userName} has been blocked`
    };

    return res.redirect('/admin/users');

  } catch (error) {
    console.error(error);
    req.session.toast = { type: 'error', msg: 'Something went wrong' };
    return res.redirect('/admin/users');
  }
};

export const adminLogout = (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie('connect.sid', { path: '/' });
    return res.redirect('/admin/login');
  });
};