/**
 * Call this ONCE, right before order.save() at checkout time.
 * It mutates orderItems in place, adding allocatedCoupon and allocatedGst
 * to each item, proportional to that item's share of the subtotal.
 *
 * Rounding remainder is dumped onto the LAST item so the sums always
 * exactly match order.couponApplied and order.gstAmount (no paisa drift).
 *
 * @param {Array} orderItems   - array of order item objects (mutated in place)
 * @param {Number} couponApplied - total coupon amount for the whole order
 * @param {Number} gstRate     - e.g. 0.05 for 5%
 */
export function allocateOrderItemCharges(orderItems, couponApplied, gstRate) {
  const subTotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);

  if (subTotal <= 0) {
    orderItems.forEach((i) => {
      i.allocatedCoupon = 0;
      i.allocatedGst = 0;
    });
    return { subTotal: 0, totalCoupon: 0, totalGst: 0 };
  }

  
  const taxableValue = Math.max(subTotal - (couponApplied || 0), 0);
  const targetGstTotal = Math.round(taxableValue * gstRate);

  let couponRunning = 0;
  let gstRunning = 0;

  orderItems.forEach((item, idx) => {
    const isLast = idx === orderItems.length - 1;
    const share = item.totalPrice / subTotal;

    let itemCoupon = Math.round((couponApplied || 0) * share);
    let itemGst = Math.round(targetGstTotal * share);

    if (isLast) {
     
      itemCoupon = (couponApplied || 0) - couponRunning;
      itemGst = targetGstTotal - gstRunning;
    }

    item.allocatedCoupon = itemCoupon;
    item.allocatedGst = itemGst;

    couponRunning += itemCoupon;
    gstRunning += itemGst;
  });

  return { subTotal, totalCoupon: couponRunning, totalGst: gstRunning };
}

