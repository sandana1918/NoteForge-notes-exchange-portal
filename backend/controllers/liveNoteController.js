const crypto = require('crypto');
const LiveNote = require('../models/liveNoteModel');

const createShareId = () => crypto.randomBytes(8).toString('hex');

const createLiveNote = async (req, res, next) => {
  try {
    const title = (req.body.title || 'Untitled Live Note').trim();
    const note = await LiveNote.create({
      title,
      content: req.body.content || '',
      shareId: createShareId(),
      createdBy: req.user._id,
      isPublic: true,
      lastEditedAt: new Date()
    });

    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
};

const getMyLiveNotes = async (req, res, next) => {
  try {
    const notes = await LiveNote.find({ createdBy: req.user._id }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    next(err);
  }
};

const getOwnLiveNote = async (req, res, next) => {
  try {
    const note = await LiveNote.findOne({ shareId: req.params.shareId, createdBy: req.user._id });
    if (!note) {
      res.status(404);
      throw new Error('Live note not found');
    }
    res.json(note);
  } catch (err) {
    next(err);
  }
};

const getSharedLiveNote = async (req, res, next) => {
  try {
    const note = await LiveNote.findOne({ shareId: req.params.shareId, isPublic: true }).populate('createdBy', 'name college branch semester');
    if (!note) {
      res.status(404);
      throw new Error('Shared note not found');
    }
    res.json(note);
  } catch (err) {
    next(err);
  }
};

const updateLiveNote = async (req, res, next) => {
  try {
    const note = await LiveNote.findOne({ shareId: req.params.shareId, createdBy: req.user._id });
    if (!note) {
      res.status(404);
      throw new Error('Live note not found');
    }

    if (req.body.title !== undefined) note.title = String(req.body.title).trim() || note.title;
    if (req.body.content !== undefined) note.content = String(req.body.content);
    if (req.body.isPublic !== undefined) note.isPublic = Boolean(req.body.isPublic);
    note.lastEditedAt = new Date();

    await note.save();
    res.json(note);
  } catch (err) {
    next(err);
  }
};

const deleteLiveNote = async (req, res, next) => {
  try {
    const note = await LiveNote.findOne({ shareId: req.params.shareId, createdBy: req.user._id });
    if (!note) {
      res.status(404);
      throw new Error('Live note not found');
    }

    await note.deleteOne();
    res.json({ message: 'Live note deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createLiveNote,
  getMyLiveNotes,
  getOwnLiveNote,
  getSharedLiveNote,
  updateLiveNote,
  deleteLiveNote
};
