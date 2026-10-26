const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ExpenseSchema = new Schema({
  description: {
    type: String,
    required: true,
    trim: true 
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Other'],
    default: 'Other',
    trim: true
  },
  // expenseDate is the date the user assigns to the transaction; legacy records fall back to createdAt.
  expenseDate: { type: Date },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', ExpenseSchema);