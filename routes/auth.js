const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Expense = require('../models/Expense');
const router = express.Router();

const SECRET = process.env.AUTH_SECRET || process.env.MONGODB_URI;
const b64 = value => Buffer.from(value).toString('base64url');
function makeToken(user) {
  const payload = b64(JSON.stringify({ sub: String(user._id), email: user.email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (err, key) => err ? reject(err) : resolve(`${salt}:${key.toString('hex')}`)));
}
async function passwordMatches(password, stored) {
  const [salt, expectedHex] = String(stored || '').split(':');
  if (!salt || !expectedHex) return false;
  const actual = await passwordHash(password, salt);
  const actualBuffer = Buffer.from(actual.split(':')[1], 'hex');
  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
router.post('/signup', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return res.status(400).json({ message: 'Name, valid email, and password (at least 8 characters) are required.' });
    }
    if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists. Please log in.' });
    const user = await User.create({ name, email, passwordHash: await passwordHash(password) });
    // Preserve pre-login project records: assign any legacy records without an owner to the first account.
    await Expense.updateMany({ userId: { $exists: false } }, { $set: { userId: user._id } });
    await Expense.updateMany({ userId: null }, { $set: { userId: user._id } });
    res.status(201).json({ token: makeToken(user), user: { id: String(user._id), name: user.name, email: user.email } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'This email is already registered.' });
    console.error('Signup error:', err.message); res.status(500).json({ message: 'Could not create account.' });
  }
});
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email });
    if (!user || !(await passwordMatches(password, user.passwordHash))) return res.status(401).json({ message: 'Incorrect email or password.' });
    res.json({ token: makeToken(user), user: { id: String(user._id), name: user.name, email: user.email } });
  } catch (err) { console.error('Login error:', err.message); res.status(500).json({ message: 'Could not log in.' }); }
});

router.get('/me', async (req, res) => {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const [payloadPart, signaturePart] = token.split('.');
    if (!payloadPart || !signaturePart || !SECRET) return res.status(401).json({ message: 'Please log in.' });
    const expected = crypto.createHmac('sha256', SECRET).update(payloadPart).digest();
    const supplied = Buffer.from(signaturePart, 'base64url');
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return res.status(401).json({ message: 'Invalid session.' });
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    if (!payload.sub || payload.exp < Date.now()) return res.status(401).json({ message: 'Session expired.' });
    const user = await User.findById(payload.sub).select('name email');
    if (!user) return res.status(401).json({ message: 'Account not found.' });
    res.json({ user: { id: String(user._id), name: user.name, email: user.email } });
  } catch { res.status(401).json({ message: 'Please log in again.' }); }
});

module.exports = { router, makeToken, SECRET };
