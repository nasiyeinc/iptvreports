const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  Callsub: { type: String },
  customer_name: { type: String },
  phone: { type: String },
  xarunta: { type: String },
  subscriptionid: { type: String },
  serial: { type: String },
  macid: { type: String },
  serial: { type: String },
  created_at: { type: Date, default: Date.now }
}, { 
  collection: 'customers',
  timestamps: false
});

customerSchema.index({ subscriptionid: 1 });
customerSchema.index({ Callsub: 1 });
customerSchema.index({ created_at: -1 });

module.exports = mongoose.model("Customer", customerSchema);