const mongoose = require("mongoose");

const iptvReportSchema = new mongoose.Schema({
  subscription_id: { type: String },
  stream: { type: String },
  log_time: { type: String },
  Callsub: { type: String },
  customer_name: { type: String },
  macid: { type: String },
  phone: { type: String },
  serial: { type: String },
  xarunta: { type: String },
  created_at: { type: Date, default: Date.now }
}, { 
  collection: 'iptvreports',
  timestamps: false
});

iptvReportSchema.index({ subscription_id: 1 });
iptvReportSchema.index({ log_time: -1 });
iptvReportSchema.index({ created_at: -1 });

module.exports = mongoose.model("IPTVReport", iptvReportSchema);