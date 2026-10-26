require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { router: authRouter, SECRET } = require('./routes/auth');
const app = express();
const PORT = Number(process.env.PORT) || 5000;
app.use(cors());
app.use(express.json({ limit: '100kb' }));
const dbURI = process.env.MONGODB_URI;
if (!dbURI) { console.error('Error: MONGODB_URI is missing from .env.'); process.exit(1); }
function authenticate(req, res, next) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 2 || !SECRET) return res.status(401).json({ message: 'Please log in to continue.' });
  const expected = crypto.createHmac('sha256', SECRET).update(parts[0]).digest();
  let supplied;
  try { supplied = Buffer.from(parts[1], 'base64url'); } catch { return res.status(401).json({ message: 'Invalid session. Please log in again.' }); }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return res.status(401).json({ message: 'Invalid session. Please log in again.' });
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!payload.sub || !payload.exp || payload.exp < Date.now()) return res.status(401).json({ message: 'Session expired. Please log in again.' });
    req.user = { id: payload.sub, email: payload.email }; next();
  } catch { return res.status(401).json({ message: 'Invalid session. Please log in again.' }); }
}
app.use('/api/auth', authRouter);
app.use('/api/expenses', authenticate, require('./routes/expenses'));
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
mongoose.connect(dbURI)
  .then(() => {
    console.log('MongoDB connected successfully.');
    const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    server.on('error', err => {
      if (err.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. Stop the other server or set PORT=5001 in .env.`);
      else console.error('Server error:', err.message);
      process.exitCode = 1;
    });
  })
  .catch(err => { console.error('MongoDB connection error:', err.message); process.exit(1); });
