const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Note = require('../models/noteModel');
const Vote = require('../models/voteModel');

const generateToken = (userId) => jwt.sign(
  { id: userId },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  college: user.college,
  branch: user.branch,
  semester: user.semester,
  role: user.role
});

const register = async (req, res, next) => {
  try {
    const { name, email, password, college, branch, semester } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Name, email and password are required');
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error('Email already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email, password: hashedPassword, college, branch, semester });

    res.status(201).json({
      ...publicUser(user),
      token: generateToken(user._id)
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400);
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400);
      throw new Error('Invalid credentials');
    }

    res.json({
      ...publicUser(user),
      token: generateToken(user._id)
    });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  res.json(req.user);
};

const updateProfile = async (req, res, next) => {
  try {
    const fields = ['name', 'college', 'branch', 'semester'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) req.user[field] = req.body[field];
    });

    const updated = await req.user.save();
    res.json(publicUser(updated));
  } catch (err) {
    next(err);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userNotes = await Note.find({ uploadedBy: userId }).select('_id');
    const noteIds = userNotes.map((note) => note._id);

    await Vote.deleteMany({ $or: [{ userId }, { noteId: { $in: noteIds } }] });
    await Note.deleteMany({ uploadedBy: userId });
    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateProfile, deleteAccount };

