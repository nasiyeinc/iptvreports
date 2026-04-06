const router = require("express").Router();
const Customer = require("../models/Customer");
const IPTVReport = require("../models/IPTVReport");
const User = require("../models/User");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

// ==================== AUTHENTICATION ====================
router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User.findOne({ username, password });
    
    if (user) {
      return res.json({ 
        role: user.type, 
        name: user.username, 
        username: user.username,
        mobile: user.mobile 
      });
    }
    res.status(400).json({ msg: "Invalid login" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== USER MANAGEMENT (FULL CRUD) ====================

// GET all users
router.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}).sort({ actionDate: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single user by ID
router.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE new user
router.post("/api/users", async (req, res) => {
  try {
    const { mobile, username, password, type } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ msg: "Username already exists" });
    }
    
    const newUser = new User({
      mobile: mobile || '',
      username,
      password,
      type: type || 'normal',
      actionDate: new Date()
    });
    
    const savedUser = await newUser.save();
    res.status(201).json({ msg: "User created successfully", user: savedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE user
router.put("/api/users/:id", async (req, res) => {
  try {
    const { mobile, username, password, type } = req.body;
    
    const updateData = {
      mobile: mobile || '',
      username,
      type: type || 'normal',
      actionDate: new Date()
    };
    
    if (password && password.trim() !== '') {
      updateData.password = password;
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ msg: "User not found" });
    }
    
    res.json({ msg: "User updated successfully", user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user
router.delete("/api/users/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CUSTOMERS - VIEW ONLY ====================

// GET customers with date range filter
router.get("/api/customers", async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.created_at = { $gte: start, $lte: end };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)),
      Customer.countDocuments(query)
    ]);
    
    res.json({
      customers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      filter: { startDate, endDate }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET single customer by ID (VIEW ONLY)
router.get("/api/customers/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ msg: "Customer not found" });
    }
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== IPTV REPORTS - VIEW ONLY ====================

// GET IPTV reports with date range filter
router.get("/api/iptv-reports", async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50, search } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      query.log_time = {
        $gte: startDate,
        $lte: endDate + " 23:59:59"
      };
    }
    
    if (search) {
      query.$or = [
        { subscription_id: { $regex: search, $options: 'i' } },
        { stream: { $regex: search, $options: 'i' } },
        { customer_name: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [reports, total] = await Promise.all([
      IPTVReport.find(query).sort({ log_time: -1 }).skip(skip).limit(parseInt(limit)),
      IPTVReport.countDocuments(query)
    ]);
    
    res.json({
      reports,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      filter: { startDate, endDate }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET reports by subscription ID
router.get("/api/iptv-reports/subscription/:subscriptionId", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { subscription_id: req.params.subscriptionId };
    
    if (startDate && endDate) {
      query.log_time = {
        $gte: startDate,
        $lte: endDate + " 23:59:59"
      };
    }
    
    const reports = await IPTVReport.find(query).sort({ log_time: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== IPTV REPORTS INSERT (API) ====================

// INSERT single IPTV report
router.post("/api/iptv-reports", async (req, res) => {
  try {
    const { subscription_id, stream, log_time, Callsub, customer_name, macid, phone, serial, xarunta } = req.body;
    
    const newReport = new IPTVReport({
      subscription_id,
      stream,
      log_time,
      Callsub: Callsub || '',
      customer_name: customer_name || '',
      macid: macid || '',
      phone: phone || '',
      serial: serial || '',
      xarunta: xarunta || '',
      created_at: new Date()
    });
    
    const savedReport = await newReport.save();
    res.status(201).json({ msg: "Report inserted successfully", report: savedReport });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// INSERT multiple IPTV reports
router.post("/api/iptv-reports/bulk", async (req, res) => {
  try {
    const reports = req.body.reports;
    if (!Array.isArray(reports)) {
      return res.status(400).json({ msg: "Reports must be an array" });
    }
    
    const reportsWithDate = reports.map(report => ({
      ...report,
      created_at: new Date()
    }));
    
    const inserted = await IPTVReport.insertMany(reportsWithDate);
    res.status(201).json({ msg: `${inserted.length} reports inserted`, count: inserted.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DASHBOARD SUMMARY - DYNAMIC WITH DATE RANGE ====================

router.get("/api/summary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let customerQuery = {};
    let reportQuery = {};
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      customerQuery.created_at = { $gte: start, $lte: end };
      reportQuery.log_time = {
        $gte: startDate,
        $lte: endDate + " 23:59:59"
      };
    }
    
    // Get all counts with date filter
    const [totalCustomers, totalIPTVReports, uniqueStreams, recentCustomers, recentReports, xaruntaStats, dailyStats] = await Promise.all([
      Customer.countDocuments(customerQuery),
      IPTVReport.countDocuments(reportQuery),
      IPTVReport.distinct("stream", reportQuery),
      Customer.find(customerQuery).sort({ created_at: -1 }).limit(10),
      IPTVReport.find(reportQuery).sort({ log_time: -1 }).limit(10),
      Customer.aggregate([
        { $match: customerQuery },
        { $group: { _id: "$xarunta", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      // Daily breakdown for charts
      IPTVReport.aggregate([
        { $match: reportQuery },
        {
          $group: {
            _id: { $substr: ["$log_time", 0, 10] },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ])
    ]);
    
    // Customer trend by day
    const customerTrend = await Customer.aggregate([
      { $match: customerQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);
    
    res.json({
      totalCustomers,
      totalIPTVReports,
      uniqueStreams: uniqueStreams.length,
      recentCustomers,
      recentReports,
      xaruntaStats,
      dailyStats,
      customerTrend,
      filter: { startDate, endDate },
      lastUpdate: new Date()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== CUSTOMER WITH THEIR REPORTS ====================

router.get("/api/customer-full/:subscriptionId", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const subscriptionId = req.params.subscriptionId;
    
    let reportQuery = { subscription_id: subscriptionId };
    if (startDate && endDate) {
      reportQuery.log_time = {
        $gte: startDate,
        $lte: endDate + " 23:59:59"
      };
    }
    
    const [customer, reports] = await Promise.all([
      Customer.findOne({ subscriptionid: subscriptionId }),
      IPTVReport.find(reportQuery).sort({ log_time: -1 })
    ]);
    
    if (!customer) {
      return res.status(404).json({ msg: "Customer not found" });
    }
    
    res.json({
      customer,
      reports,
      reportCount: reports.length,
      filter: { startDate, endDate }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== EXPORT FUNCTIONS (VIEW ONLY) ====================

// Export Customers to Excel with date filter
router.get("/api/export/customers-excel", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.created_at = { $gte: start, $lte: end };
    }
    
    const customers = await Customer.find(query).sort({ created_at: -1 });
    
    const worksheet = XLSX.utils.json_to_sheet(customers.map(c => ({
      'Callsub': c.Callsub,
      'Customer Name': c.customer_name,
      'Phone': c.phone,
      'Xarunta': c.xarunta,
      'Subscription ID': c.subscriptionid,
      'Serial': c.serial,
      'MAC ID': c.macid,
      'Serial ID': c.Serial,
      'Created Date': c.created_at ? new Date(c.created_at).toLocaleDateString() : ''
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    
    res.setHeader("Content-Disposition", "attachment; filename=customers.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export IPTV Reports to Excel with date filter
router.get("/api/export/iptv-excel", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      query.log_time = {
        $gte: startDate,
        $lte: endDate + " 23:59:59"
      };
    }
    
    const reports = await IPTVReport.find(query).sort({ log_time: -1 });
    
    const worksheet = XLSX.utils.json_to_sheet(reports.map(r => ({
      'Subscription ID': r.subscription_id,
      'Stream': r.stream,
      'Log Time': r.log_time,
      'Callsub': r.Callsub || '',
      'Customer Name': r.customer_name || '',
      'MAC ID': r.macid || '',
      'Phone': r.phone || '',
      'Xarunta': r.xarunta || ''
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "IPTV Reports");
    
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    
    res.setHeader("Content-Disposition", "attachment; filename=iptv_reports.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export to PDF
router.get("/api/export/pdf", async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    let data = [];
    let title = "";
    
    if (type === 'customers') {
      let query = {};
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.created_at = { $gte: start, $lte: end };
      }
      data = await Customer.find(query).sort({ created_at: -1 });
      title = "Customers Report";
    } else {
      let query = {};
      if (startDate && endDate) {
        query.log_time = {
          $gte: startDate,
          $lte: endDate + " 23:59:59"
        };
      }
      data = await IPTVReport.find(query).sort({ log_time: -1 });
      title = "IPTV Reports";
    }
    
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    
    res.setHeader("Content-Disposition", `attachment; filename=${type}_reports.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    
    doc.pipe(res);
    
    doc.fontSize(24).font("Helvetica-Bold").text(`Nasiye - ${title}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(10).font("Helvetica").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown();
    
    if (startDate && endDate) {
      doc.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`);
      doc.moveDown();
    }
    
    doc.text(`Total Records: ${data.length}`);
    doc.moveDown();
    
    const startX = 50;
    let y = doc.y + 10;
    
    doc.fontSize(9).font("Helvetica-Bold");
    
    if (type === 'customers') {
      doc.text("Callsub", startX, y, { width: 70 });
      doc.text("Customer Name", startX + 75, y, { width: 120 });
      doc.text("Phone", startX + 200, y, { width: 100 });
      doc.text("Xarunta", startX + 305, y, { width: 60 });
      doc.text("Sub ID", startX + 370, y, { width: 70 });
      y += 20;
      doc.font("Helvetica");
      
      data.forEach((item) => {
        if (y > 750) { doc.addPage(); y = 50; }
        doc.text(item.Callsub || '', startX, y, { width: 70 });
        doc.text((item.customer_name || '').substring(0, 20), startX + 75, y, { width: 120 });
        doc.text(item.phone || '', startX + 200, y, { width: 100 });
        doc.text(item.xarunta || '', startX + 305, y, { width: 60 });
        doc.text(item.subscriptionid || '', startX + 370, y, { width: 70 });
        y += 18;
      });
    } else {
      doc.text("Sub ID", startX, y, { width: 80 });
      doc.text("Stream", startX + 85, y, { width: 200 });
      doc.text("Log Time", startX + 290, y, { width: 120 });
      doc.text("Customer", startX + 415, y, { width: 100 });
      y += 20;
      doc.font("Helvetica");
      
      data.forEach((item) => {
        if (y > 750) { doc.addPage(); y = 50; }
        doc.text(item.subscription_id || '', startX, y, { width: 80 });
        doc.text((item.stream || '').substring(0, 35), startX + 85, y, { width: 200 });
        doc.text(item.log_time || '', startX + 290, y, { width: 120 });
        doc.text((item.customer_name || '').substring(0, 15), startX + 415, y, { width: 100 });
        y += 18;
      });
    }
    
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/iptvreport", async (req, res) => {
  Customer.findOne(
  { subscriptionid: req.body.subscription_id },
  {
    phone: 1,
    customer_name: 1,
    xarunta: 1,
    serial: 1,
    macid: 1,
    _id: 0
  }
).lean().then((customer) => {
  req.body.phone = customer?.phone || null;
  req.body.customer_name = customer?.customer_name || null;
  req.body.xarunta = customer?.xarunta || null;
  req.body.serial = customer?.serial || null;
  req.body.macid = customer?.macid || null;

console.log(req.body)

  new IPTVReport(req.body).save().then((inserted) => {
    res.send({ success: true, msg: "done" });
  }, (err) => {
    console.log(err);
    res.send({ success: false, msg: "something went wrong" });
  });

}, (err) => {
  console.log(err);
  res.send({ success: false, msg: "something went wrong" });
});
});

module.exports = router;
