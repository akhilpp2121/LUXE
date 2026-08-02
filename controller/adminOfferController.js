import {
  offerDataLoad,
  createOffer,
  updateOffer,
  toggleOfferById,
  getOfferById,
} from "../service/adminOfferService.js";

const LIMIT = 10;

export const offerLoad = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const status = req.query.status || "";

    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (status) filter.isActive = status === "true";

    const data = await offerDataLoad(filter, page, LIMIT);

    return res.render("Admin/offerPage", {
      activePage: "offer",
      offers: data.success ? data.data : [],
      search,
      status,
      pagination: data.pagination,
    });
  } catch (e) {
    console.error(e);
    return res.redirect("/admin");
  }
};

export const offerAddPage = (req, res) => {
  try {
    const error = req.session.addOfferError || null;
    req.session.addOfferError = null;

    req.session.save(() => {
      return res.render("Admin/offerAddPage", {
        activePage: "offer",
        error,
      });
    });
  } catch (e) {
    console.error(e);
    return res.redirect("/admin/offer");
  }
};


const validateOfferInput = ({ discountType, discountValue, maxDiscount }) => {
  const type = (discountType || "").toUpperCase();
  const value = Number(discountValue);

  if (isNaN(value) || value <= 0) {
    return "Discount value must be a positive number.";
  }

  if (type === "PERCENTAGE") {
    if (value > 99) {
      return "Percentage discount cannot exceed 99%.";
    }
    if (maxDiscount === undefined || maxDiscount === null || maxDiscount === "") {
      return "Max discount cap is required for percentage offers.";
    }
    const cap = Number(maxDiscount);
    if (isNaN(cap) || cap <= 0) {
      return "Max discount cap must be a positive number.";
    }
  } else if (type === "FLAT") {
    if (maxDiscount !== undefined && maxDiscount !== null && maxDiscount !== "") {
      const cap = Number(maxDiscount);
      if (isNaN(cap) || cap <= 0) {
        return "Max discount must be a positive number.";
      }
      if (cap < value) {
        return "Max discount cannot be less than the flat discount value.";
      }
    }
  } else {
    return "Invalid discount type.";
  }

  return null;
};

export const offerAdd = async (req, res) => {
  try {
    const {
      name,
      type,
      discountType,
      discountValue,
      startDate,
      endDate,
      maxDiscount,
    } = req.body;

    if (
      !name ||
      !type ||
      !discountType ||
      !discountValue ||
      !startDate ||
      !endDate
    ) {
      req.session.addOfferError = "All required fields must be filled.";
      return req.session.save(() => res.redirect("/admin/offer-add"));
    }

    if (new Date(startDate) >= new Date(endDate)) {
      req.session.addOfferError = "Start date must be before end date.";
      return req.session.save(() => res.redirect("/admin/offer-add"));
    }

    // FIX: catch the percentage/maxDiscount mismatch HERE with a specific
    // message, before ever reaching the DB layer
    const inputError = validateOfferInput({ discountType, discountValue, maxDiscount });
    if (inputError) {
      req.session.addOfferError = inputError;
      return req.session.save(() => res.redirect("/admin/offer-add"));
    }

    const result = await createOffer({
      name: name.trim(),
      type,
      discountType,
      discountValue: Number(discountValue),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
    });

    if (!result.success) {
      req.session.addOfferError = result.message;
      return req.session.save(() => res.redirect("/admin/offer-add"));
    }

    return res.redirect("/admin/offer");
  } catch (e) {
    console.error(e);
    req.session.addOfferError = "Server error. Please try again.";
    return req.session.save(() => res.redirect("/admin/offer-add"));
  }
};

export const offerEditPage = async (req, res) => {
  try {
    const result = await getOfferById(req.params.id);

    if (!result.success) return res.redirect("/admin/offer");

    const error = req.session.editOfferError || null;
    req.session.editOfferError = null;

    req.session.save(() => {
      return res.render("Admin/offerEditPage", {
        activePage: "offer",
        offer: result.data,
        error,
      });
    });
  } catch (e) {
    console.error(e);
    return res.redirect("/admin/offer");
  }
};

export const offerEdit = async (req, res) => {
  try {
    const {
      name,
      type,
      discountType,
      discountValue,
      startDate,
      endDate,
      maxDiscount,
    } = req.body;

    if (
      !name ||
      !type ||
      !discountType ||
      !discountValue ||
      !startDate ||
      !endDate
    ) {
      req.session.editOfferError = "All required fields must be filled.";
      return req.session.save(() => res.redirect(`/admin/offer-edit/${req.params.id}`));
    }

    if (new Date(startDate) >= new Date(endDate)) {
      req.session.editOfferError = "Start date must be before end date.";
      return req.session.save(() => res.redirect(`/admin/offer-edit/${req.params.id}`));
    }

    // FIX: same specific-error check applied on edit too (previously missing here)
    const inputError = validateOfferInput({ discountType, discountValue, maxDiscount });
    if (inputError) {
      req.session.editOfferError = inputError;
      return req.session.save(() => res.redirect(`/admin/offer-edit/${req.params.id}`));
    }

    const result = await updateOffer(req.params.id, {
      name: name.trim(),
      type,
      discountType,
      discountValue: Number(discountValue),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
    });

    if (!result.success) {
      req.session.editOfferError = result.message;
      return req.session.save(() => res.redirect(`/admin/offer-edit/${req.params.id}`));
    }

    return res.redirect("/admin/offer");
  } catch (e) {
    console.error(e);
    req.session.editOfferError = "Server error. Please try again.";
    return req.session.save(() => res.redirect(`/admin/offer-edit/${req.params.id}`));
  }
};

export const offerToggle = async (req, res) => {
  try {
    const result = await toggleOfferById(req.params.id);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      isActive: result.data.isActive,
      message: `Offer ${result.data.isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};