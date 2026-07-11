import dayjs from "dayjs";
import Order from "../model/orderModel.js";
import PDFDocument from "pdfkit";

const getPeriodConfig = (query) => {
  const filter = ["daily", "weekly", "monthly", "yearly", "custom"].includes(
    query.filter,
  )
    ? query.filter
    : "weekly";

  const now = dayjs();

  if (filter === "daily") {
    return {
      filter,
      start: now.startOf("day").toDate(),
      end: now.endOf("day").toDate(),
      period: "Today",
    };
  }

  if (filter === "monthly") {
    return {
      filter,
      start: now.startOf("month").toDate(),
      end: now.endOf("day").toDate(),
      period: "This Month",
    };
  }

  if (filter === "yearly") {
    return {
      filter,
      start: now.startOf("year").toDate(),
      end: now.endOf("day").toDate(),
      period: "This Year",
    };
  }

  if (filter === "custom" && query.from && query.to) {
    const from = dayjs(query.from);
    const to = dayjs(query.to);

    if (from.isValid() && to.isValid()) {
      return {
        filter,
        from: query.from,
        to: query.to,
        start: from.startOf("day").toDate(),
        end: to.endOf("day").toDate(),
        period: `${from.format("DD MMM YYYY")} - ${to.format("DD MMM YYYY")}`,
      };
    }
  }

  return {
    filter,
    start: now.subtract(6, "day").startOf("day").toDate(),
    end: now.endOf("day").toDate(),
    period: "This Week",
  };
};

const mapStatus = (order) => {
  if (order.orderStatus === "cancelled" || order.deliveryStatus === "cancelled")
    return "Cancelled";
  if (order.orderStatus === "completed" || order.deliveryStatus === "delivered")
    return "Delivered";
  return "Processing";
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fileSafePeriod = (period) =>
  String(period || "sales-report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "sales-report";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getAnalyticsReportData = async (query) => {
  const periodConfig = getPeriodConfig(query);
  const match = {
    createdAt: { $gte: periodConfig.start, $lte: periodConfig.end },
  };

  const rawOrders = await Order.find(match).sort({ createdAt: -1 }).lean();

  const orders = rawOrders.map((order) => {
    const orderAmount = Number(order.subTotal || 0);
    const totalDiscount = Number(order.couponApplied || 0);
    const netAmount = Number(order.totalAmount || orderAmount - totalDiscount);

    return {
      id: order.orderCode || order._id,
      date: dayjs(order.createdAt || order.orderDate).format("DD MMM YYYY"),
      customer: order.shippingAddress?.username || "Customer",
      orderAmount,
      coupon: totalDiscount > 0 ? "Applied" : "",
      totalDiscount,
      netAmount,
      status: mapStatus(order),
    };
  });

  const summary = orders.reduce(
    (totals, order) => {
      totals.totalOrders += 1;
      totals.orderAmount += order.orderAmount;
      totals.totalDiscount += order.totalDiscount;
      totals.netRevenue += order.netAmount;
      return totals;
    },
    { totalOrders: 0, orderAmount: 0, totalDiscount: 0, netRevenue: 0 },
  );

  return { periodConfig, summary, orders };
};

export const getAnalyticsPage = async (req, res) => {
  try {
    const { periodConfig, summary, orders } = await getAnalyticsReportData(
      req.query,
    );

    return res.render("Admin/analyticsPageN", {
      summary,
      orders,
      period: periodConfig.period,
      filter: periodConfig.filter,
      from: periodConfig.from || "",
      to: periodConfig.to || "",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send("Analytics Error");
  }
};

export const downloadAnalyticsExcel = async (req, res) => {
  try {
    const { periodConfig, summary, orders } = await getAnalyticsReportData(
      req.query,
    );
    const rows = orders
      .map(
        (order) => `
      <tr>
        <td>${escapeHtml(order.id)}</td>
        <td>${escapeHtml(order.date)}</td>
        <td>${escapeHtml(order.customer)}</td>
        <td>${order.orderAmount.toFixed(2)}</td>
        <td>${escapeHtml(order.coupon || "-")}</td>
        <td>${order.totalDiscount.toFixed(2)}</td>
        <td>${order.netAmount.toFixed(2)}</td>
        <td>${escapeHtml(order.status)}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h2>Sales Analytics Report</h2>
          <p>Period: ${escapeHtml(periodConfig.period)}</p>
          <table border="1">
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total Orders</td><td>${summary.totalOrders}</td></tr>
            <tr><td>Order Amount</td><td>${summary.orderAmount.toFixed(2)}</td></tr>
            <tr><td>Total Discount</td><td>${summary.totalDiscount.toFixed(2)}</td></tr>
            <tr><td>Net Revenue</td><td>${summary.netRevenue.toFixed(2)}</td></tr>
          </table>
          <br>
          <table border="1">
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Order Amount</th>
              <th>Coupon Code</th>
              <th>Discount</th>
              <th>Net Amount</th>
              <th>Status</th>
            </tr>
            ${rows || '<tr><td colspan="8">No orders found for this period.</td></tr>'}
          </table>
        </body>
      </html>
    `;

    const filename = `sales-report-${fileSafePeriod(periodConfig.period)}.xls`;
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(html);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Excel Download Error");
  }
};

export const downloadAnalyticsPdf = async (req, res) => {
  try {
    const { periodConfig, summary, orders } = await getAnalyticsReportData(
      req.query,
    );
    const filename = `sales-report-${fileSafePeriod(periodConfig.period)}.pdf`;
    const doc = new PDFDocument({
      margin: 36,
      size: "A4",
      layout: "landscape",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(18).fillColor("#0f172a").text("Sales Analytics Report");
    doc.moveDown(0.25);
    doc
      .fontSize(10)
      .fillColor("#475569")
      .text(`Period: ${periodConfig.period}`);
    doc.text(`Generated: ${dayjs().format("DD MMM YYYY, hh:mm A")}`);
    doc.moveDown();

    doc.fontSize(11).fillColor("#111827");
    doc
      .text(`Total Orders: ${summary.totalOrders}`, { continued: true })
      .text(`   Order Amount: ${formatCurrency(summary.orderAmount)}`, {
        continued: true,
      })
      .text(`   Total Discount: ${formatCurrency(summary.totalDiscount)}`, {
        continued: true,
      })
      .text(`   Net Revenue: ${formatCurrency(summary.netRevenue)}`);
    doc.moveDown();

    const columns = [
      { label: "Order ID", width: 82 },
      { label: "Date", width: 78 },
      { label: "Customer", width: 130 },
      { label: "Order Amt", width: 80 },
      { label: "Coupon", width: 70 },
      { label: "Discount", width: 72 },
      { label: "Net Amt", width: 78 },
      { label: "Status", width: 78 },
    ];
    const startX = doc.x;
    let y = doc.y;
    const rowHeight = 22;

    const drawRow = (cells, isHeader = false) => {
      let x = startX;
      if (y + rowHeight > doc.page.height - 36) {
        doc.addPage();
        y = 36;
      }

      columns.forEach((column, index) => {
        doc.rect(x, y, column.width, rowHeight).strokeColor("#cbd5e1").stroke();
        doc
          .fontSize(isHeader ? 8 : 7)
          .fillColor(isHeader ? "#0f172a" : "#334155")
          .text(String(cells[index] ?? ""), x + 4, y + 7, {
            width: column.width - 8,
            height: rowHeight - 8,
            ellipsis: true,
          });
        x += column.width;
      });
      y += rowHeight;
    };

    drawRow(
      columns.map((column) => column.label),
      true,
    );

    if (orders.length) {
      orders.forEach((order) => {
        drawRow([
          order.id,
          order.date,
          order.customer,
          formatCurrency(order.orderAmount),
          order.coupon || "-",
          formatCurrency(order.totalDiscount),
          formatCurrency(order.netAmount),
          order.status,
        ]);
      });
    } else {
      drawRow(["No orders found for this period.", "", "", "", "", "", "", ""]);
    }

    doc.end();
  } catch (err) {
    console.log(err);
    return res.status(500).send("PDF Download Error");
  }
};
