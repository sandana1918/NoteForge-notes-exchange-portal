const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const Note = require('../models/noteModel');
const Vote = require('../models/voteModel');

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
  return String(tags).split(',').map((tag) => tag.trim()).filter(Boolean);
};

const buildFilter = (query) => {
  const { semester, branch, subject, subjectCode, category, academicYear, q, search } = query;
  const filter = {};
  const term = q || search;

  if (semester) filter.semester = semester;
  if (branch) filter.branch = { $regex: branch, $options: 'i' };
  if (subject) filter.subject = { $regex: subject, $options: 'i' };
  if (subjectCode) filter.subjectCode = { $regex: subjectCode, $options: 'i' };
  if (category) filter.category = category;
  if (academicYear) filter.academicYear = academicYear;
  if (term) {
    filter.$or = [
      { title: { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } },
      { subject: { $regex: term, $options: 'i' } },
      { subjectCode: { $regex: term, $options: 'i' } },
      { tags: { $regex: term, $options: 'i' } }
    ];
  }

  return filter;
};

const sortMap = {
  latest: { createdAt: -1 },
  popular: { upvotes: -1, downloads: -1, createdAt: -1 },
  downloads: { downloads: -1, createdAt: -1 },
  views: { views: -1, createdAt: -1 }
};

const uploadNote = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No file uploaded');
    }

    const { title, subject, subjectCode, semester, branch, category, academicYear, description, tags } = req.body;
    if (!title || !subject || !semester || !branch) {
      res.status(400);
      throw new Error('Title, subject, semester and branch are required');
    }

    const note = await Note.create({
      title,
      subject,
      subjectCode,
      semester,
      branch,
      category: category || 'Lecture Notes',
      academicYear,
      description,
      tags: parseTags(tags),
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user._id
    });

    const populated = await note.populate('uploadedBy', 'name email college branch semester');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

const getNotes = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 60);
    const skip = (page - 1) * limit;
    const filter = buildFilter(req.query);
    const sort = sortMap[req.query.sort] || sortMap.popular;

    const [notes, total] = await Promise.all([
      Note.find(filter).populate('uploadedBy', 'name email college branch semester').sort(sort).skip(skip).limit(limit),
      Note.countDocuments(filter)
    ]);

    res.json({ notes, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
};

const getMyNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    next(err);
  }
};

const getNoteById = async (req, res, next) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('uploadedBy', 'name email college branch semester');

    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }

    res.json(note);
  } catch (err) {
    next(err);
  }
};

const updateNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }

    if (note.uploadedBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this note');
    }

    const fields = ['title', 'subject', 'subjectCode', 'semester', 'branch', 'category', 'academicYear', 'description'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) note[field] = req.body[field];
    });
    if (req.body.tags !== undefined) note.tags = parseTags(req.body.tags);

    const updated = await note.save();
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }

    if (note.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized to delete this note');
    }

    await Vote.deleteMany({ noteId: note._id });
    const filePath = path.join(__dirname, '..', 'uploads', note.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await note.deleteOne();

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    next(err);
  }
};

const downloadNote = async (req, res, next) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    );

    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }

    const filePath = path.join(__dirname, '..', 'uploads', note.fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error('File missing on server');
    }

    res.download(filePath, note.originalName || note.fileName);
  } catch (err) {
    next(err);
  }
};

const serveNoteFile = async (req, res, next) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }

    const filePath = path.join(__dirname, '..', 'uploads', note.fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error('File missing on server');
    }

    res.setHeader('Content-Type', note.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${note.originalName || note.fileName}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
};

const decodeXml = (value) => String(value || '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'");

const getOfficePreview = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }

    const isPptx = note.fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      || path.extname(note.fileName).toLowerCase() === '.pptx';

    if (!isPptx) {
      return res.json({ supported: false, slides: [] });
    }

    const filePath = path.join(__dirname, '..', 'uploads', note.fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error('File missing on server');
    }

    const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => Number(a.match(/slide(\d+)\.xml/)[1]) - Number(b.match(/slide(\d+)\.xml/)[1]));

    const slides = [];
    for (const fileName of slideFiles) {
      const xml = await zip.file(fileName).async('string');
      const matches = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)];
      const text = matches.map((match) => decodeXml(match[1]).trim()).filter(Boolean);
      slides.push({
        number: slides.length + 1,
        title: text[0] || `Slide ${slides.length + 1}`,
        bullets: text.slice(1, 12),
        text: text.join(' ')
      });
    }

    res.json({ supported: true, slideCount: slides.length, slides });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const [totals, categoryBreakdown, branchBreakdown, recent] = await Promise.all([
      Note.aggregate([{ $group: { _id: null, notes: { $sum: 1 }, downloads: { $sum: '$downloads' }, views: { $sum: '$views' }, upvotes: { $sum: '$upvotes' } } }]),
      Note.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Note.aggregate([{ $group: { _id: '$branch', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
      Note.find().sort({ createdAt: -1 }).limit(5).populate('uploadedBy', 'name')
    ]);

    res.json({
      totals: totals[0] || { notes: 0, downloads: 0, views: 0, upvotes: 0 },
      categoryBreakdown,
      branchBreakdown,
      recent
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadNote, getNotes, getMyNotes, getNoteById, updateNote, deleteNote, downloadNote, serveNoteFile, getOfficePreview, getStats };
