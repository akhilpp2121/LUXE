import { offerDataLoad, createOffer, updateOffer, toggleOfferById, getOfferById } from '../service/adminOfferService.js'
 
const LIMIT = 10;
 
export const offerLoad = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)   || 1;
    const search = req.query.search           || '';
    const status = req.query.status           || '';
 
    const filter = {};
    if (search) filter.name     = { $regex: search, $options: 'i' };
    if (status) filter.isActive = status === 'true';
 
    const data = await offerDataLoad(filter, page, LIMIT);
 
    return res.render('Admin/offerPage', {
      activePage:  'offer',
      offers:      data.success ? data.data : [],
      search,
      status,
      pagination:  data.pagination,
    });
  } catch (e) {
    console.error(e);
    return res.redirect('/admin');
  }
};
 
export const offerAddPage = (req, res) => {
  try {
    return res.render('Admin/offerAddPage', { activePage: 'offer', error: null });
  } catch (e) {
    console.error(e);
    return res.redirect('/admin/offer');
  }
};
 
export const offerAdd = async (req, res) => {
  try {
    const { name, type, discountType, discountValue, startDate, endDate, maxDiscount } = req.body;
 
    if (!name || !type || !discountType || !discountValue || !startDate || !endDate) {
      return res.render('Admin/offerAddPage', {
        activePage: 'offer',
        error: 'All required fields must be filled.',
      });
    }
 
    if (new Date(startDate) >= new Date(endDate)) {
      return res.render('Admin/offerAddPage', {
        activePage: 'offer',
        error: 'Start date must be before end date.',
      });
    }
 
    const result = await createOffer({
      name:          name.trim(),
      type,
      discountType,
      discountValue: Number(discountValue),
      startDate:     new Date(startDate),
      endDate:       new Date(endDate),
      maxDiscount:   maxDiscount ? Number(maxDiscount) : null,
    });
 
    if (!result.success) {
      return res.render('Admin/offerAddPage', {
        activePage: 'offer',
        error: result.message,
      });
    }
 
    return res.redirect('/admin/offer');
  } catch (e) {
    console.error(e);
    return res.redirect('/admin/offer');
  }
};
 
export const offerEditPage = async (req, res) => {
  try {
    const result = await getOfferById(req.params.id);
 
    if (!result.success) return res.redirect('/admin/offer');
 
    return res.render('Admin/offerEditPage', {
      activePage: 'offer',
      offer:      result.data,
      error:      null,
    });
  } catch (e) {
    console.error(e);
    return res.redirect('/admin/offer');
  }
};
 
export const offerEdit = async (req, res) => {
  try {
    const { name, type, discountType, discountValue, startDate, endDate, maxDiscount } = req.body;
 
    if (!name || !type || !discountType || !discountValue || !startDate || !endDate) {
      const offer = await getOfferById(req.params.id);
      return res.render('Admin/offerEditPage', {
        activePage: 'offer',
        offer:      offer.data,
        error:      'All required fields must be filled.',
      });
    }
 
    if (new Date(startDate) >= new Date(endDate)) {
      const offer = await getOfferById(req.params.id);
      return res.render('Admin/offerEditPage', {
        activePage: 'offer',
        offer:      offer.data,
        error:      'Start date must be before end date.',
      });
    }
 
    const result = await updateOffer(req.params.id, {
      name:          name.trim(),
      type,
      discountType,
      discountValue: Number(discountValue),
      startDate:     new Date(startDate),
      endDate:       new Date(endDate),
      maxDiscount:   maxDiscount ? Number(maxDiscount) : null,
    });
 
    if (!result.success) {
      const offer = await getOfferById(req.params.id);
      return res.render('Admin/offerEditPage', {
        activePage: 'offer',
        offer:      offer.data,
        error:      result.message,
      });
    }
 
    return res.redirect('/admin/offer');
  } catch (e) {
    console.error(e);
    return res.redirect('/admin/offer');
  }
};
 
export const offerToggle = async (req, res) => {
  try {
    const result = await toggleOfferById(req.params.id);
 
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
 
    return res.json({
      success:  true,
      isActive: result.data.isActive,
      message:  `Offer ${result.data.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
