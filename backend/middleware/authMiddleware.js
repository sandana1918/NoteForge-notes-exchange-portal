const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : req.query.token;

  if (!token) {
    res.status(401);
    return next(new Error('No token, access denied'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401);
      return next(new Error('User not found'));
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    next(new Error('Token is invalid'));
  }
};

module.exports = protect;
