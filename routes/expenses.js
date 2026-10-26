const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Expense = require('../models/Expense');
const paymentModes = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Other'];
function validId(id) { return mongoose.Types.ObjectId.isValid(id); }
function parseExpense(body) {
  const description = String(body.description || '').trim();
  const amount = Number(body.amount);
  const category = String(body.category || '').trim();
  const paymentMode = paymentModes.includes(body.paymentMode) ? body.paymentMode : 'Other';
  const dateInput = body.expenseDate || body.createdAt;
  const expenseDate = dateInput ? new Date(`${String(dateInput).slice(0,10)}T12:00:00`) : new Date();
  if (!description || description.length > 160 || !Number.isFinite(amount) || amount <= 0 || !category || category.length > 80 || Number.isNaN(expenseDate.getTime())) return null;
  return { description, amount, category, paymentMode, expenseDate };
}
router.get('/', async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.id }).sort({ expenseDate: -1, createdAt: -1 });
    res.json(expenses);
  } catch (err) { console.error(err.message); res.status(500).json({ message: 'Could not retrieve expenses.' }); }
});
router.post('/', async (req, res) => {
  const data = parseExpense(req.body);
  if (!data) return res.status(400).json({ message: 'Enter a description, positive amount, category, and valid date.' });
  try { const saved = await Expense.create({ ...data, userId: req.user.id }); res.status(201).json(saved); }
  catch (err) { console.error(err.message); res.status(500).json({ message: 'Could not save expense.' }); }
});
router.put('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid expense ID.' });
  const data = parseExpense(req.body);
  if (!data) return res.status(400).json({ message: 'Enter a description, positive amount, category, and valid date.' });
  try {
    const updated = await Expense.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { $set: data }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Expense not found.' });
    res.json(updated);
  } catch (err) { console.error(err.message); res.status(500).json({ message: 'Could not update expense.' }); }
});
router.delete('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid expense ID.' });
  try {
    const deleted = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ message: 'Expense not found.' });
    res.json({ message: 'Expense deleted successfully.' });
  } catch (err) { console.error(err.message); res.status(500).json({ message: 'Could not delete expense.' }); }
});
module.exports = router;
