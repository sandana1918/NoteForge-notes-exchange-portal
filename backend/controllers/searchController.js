const Note = require('../models/noteModel');

const searchDocuments = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      res.status(400);
      throw new Error('Query parameter q is required');
    }

    const notes = await Note.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
        { subjectCode: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ]
    }).populate('uploadedBy', 'name email college branch semester').sort({ upvotes: -1, createdAt: -1 }).limit(30);

    res.json({ query: q, total: notes.length, results: notes });
  } catch (err) {
    next(err);
  }
};

module.exports = searchDocuments;
