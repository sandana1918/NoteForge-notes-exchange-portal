const Vote = require('../models/voteModel');
const Note = require('../models/noteModel');

const castVote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const { voteType } = req.body;
    const userId = req.user._id;

    if (!['upvote', 'downvote'].includes(voteType)) {
      res.status(400);
      throw new Error('voteType must be upvote or downvote');
    }

    const note = await Note.findById(noteId);
    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }

    const existingVote = await Vote.findOne({ userId, noteId });
    let userVote = voteType;
    let message = 'Vote cast';

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        await existingVote.deleteOne();
        if (voteType === 'upvote') note.upvotes = Math.max(0, note.upvotes - 1);
        else note.downvotes = Math.max(0, note.downvotes - 1);
        userVote = null;
        message = 'Vote removed';
      } else {
        existingVote.voteType = voteType;
        await existingVote.save();
        if (voteType === 'upvote') {
          note.upvotes += 1;
          note.downvotes = Math.max(0, note.downvotes - 1);
        } else {
          note.downvotes += 1;
          note.upvotes = Math.max(0, note.upvotes - 1);
        }
        message = 'Vote switched';
      }
    } else {
      await Vote.create({ userId, noteId, voteType });
      if (voteType === 'upvote') note.upvotes += 1;
      else note.downvotes += 1;
    }

    await note.save();
    res.json({ message, upvotes: note.upvotes, downvotes: note.downvotes, userVote });
  } catch (err) {
    next(err);
  }
};

const getVotes = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.noteId);
    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }

    res.json({ upvotes: note.upvotes, downvotes: note.downvotes });
  } catch (err) {
    next(err);
  }
};

module.exports = { castVote, getVotes };
