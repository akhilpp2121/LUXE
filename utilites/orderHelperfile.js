const STATUS_MAP = {
  placed:    "PENDING",
  cancelled: "CANCELLED",
  completed: "COMPLETED",
};

export const normaliseOrder = (o) => ({
  _id:                  o._id,
  orderCode:            o.orderCode,
  orderDate:            o.orderDate,
  expectedDeliveryDate: o.expectedDeliveryDate,
  orderMethod:          o.orderMethod,
 
  orderStatus: STATUS_MAP[o.orderStatus] || o.orderStatus.toUpperCase(),
 
  orderItems: (o.orderItems || []).map((item) => ({
    productName: item.productName,
    variantName: item.variantName,
    price:       item.price,
    quantity:    item.quantity,
    totalPrice:  item.totalPrice,
    variantId:   item.variantId,
    deliveryStatus: item.deliveryStatus || o.deliveryStatus || "pending",
  })),
 
  shippingAddress: {
    username:       o.shippingAddress?.username       || "",
    phone_number:   o.shippingAddress?.phone_number   || "",
    street_address: o.shippingAddress?.street_address || "",
    landmark:       o.shippingAddress?.landmark       || "",
    city:           o.shippingAddress?.city           || "",
    state:          o.shippingAddress?.state          || "",
    postal_code:    o.shippingAddress?.postal_code    || "",
    country:        o.shippingAddress?.country        || "",
  },
 
  subTotal:      o.subTotal      || 0,
  shippingCharge:o.shippingCharge||0,
  taxAmount:     o.taxAmount     || 0,
  couponApplied: o.couponApplied || 0,
  totalAmount:   o.totalAmount   || 0,
  deliveryStatus:o.deliveryStatus||'pending',
 
  cancelledAt: (o.cancelledAt || []).map((ca) => ({
    reason:              ca.reason,
    remarks:             ca.remarks,
    requestedAt:         ca.requestedAt,
    cancelRequestStatus: ca.cancelRequestStatus,
    cancelledProducts:   ca.cancelledProducts || [], 
  })),
 
  returnedAt: (o.returnedAt || []).map((r) => ({
    reason:              r.reason,
    remark:              r.remark,
    resolution:          r.resolution,
    variant:             r.variant,
    quantity:            r.quantity,
    requestedAt:         r.requestedAt,
    returnRequestStatus: r.returnRequestStatus,
    adminRemark:         r.adminRemark,
  })),
});
