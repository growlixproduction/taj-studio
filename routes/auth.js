const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');

router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin/dashboard');
  res.render('admin/login', { title: 'Admin Login' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM admin_users WHERE username = ?', [username]);
    if (!rows.length) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/auth/login');
    }
    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/auth/login');
    }
    req.session.admin = { id: rows[0].id, username: rows[0].username };
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred during login. Please try again.');
    res.redirect('/auth/login');
  }
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/auth/login');
});

module.exports = router;
