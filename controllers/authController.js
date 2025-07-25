const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { username, email, password, college } = req.body;
    if (!username || !email || !password || !college) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const hash = await bcrypt.hash(password, 12);
    await User.create({ username, email, password: hash, college });
    res.status(201).json({ message: 'Registered' });
  } catch (err) {
    res.status(400).json({
      message: err.code === 11000
        ? 'Username or email already taken'
        : 'Registration error'
    });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    // Set the token cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure:   true,
      sameSite: 'none',
      path:     '/',
      maxAge:   7 * 24 * 60 * 60 * 1000  // 7 days
    });

    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({ message: 'Logged in' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login error' });
  }
};

// GET /api/auth/user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).end();

    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({ username: user.username, college: user.college });
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
};

// GET /api/auth/logout
exports.logout = (req, res) => {
  // 1) Clear the cookie (must match original settings)
  res.clearCookie('token', {
    httpOnly: true,
    secure:   true,
    sameSite: 'none',
    path:     '/'
    // domain:   process.env.COOKIE_DOMAIN // uncomment if you set domain originally
  });
  // 2) Overwrite with an expired cookie
  res.cookie('token', '', {
    httpOnly: true,
    secure:   true,
    sameSite: 'none',
    path:     '/',
    expires:  new Date(0)
    // domain:   process.env.COOKIE_DOMAIN
  });
  // 3) Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.status(200).json({ message: 'Logged out' });
};
