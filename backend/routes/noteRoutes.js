const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const {
  uploadNote,
  getNotes,
  getMyNotes,
  getNoteById,
  deleteNote,
  updateNote,
  downloadNote,
  serveNoteFile,
  getOfficePreview,
  getStats
} = require('../controllers/noteController');

router.use(protect);

router.get('/', getNotes);
router.get('/stats/overview', getStats);
router.get('/my/uploads', getMyNotes);
router.post('/uploads', upload.single('file'), uploadNote);
router.get('/:id', validateObjectId('id'), getNoteById);
router.get('/:id/file', validateObjectId('id'), serveNoteFile);
router.get('/:id/preview', validateObjectId('id'), getOfficePreview);
router.get('/:id/download', validateObjectId('id'), downloadNote);
router.delete('/:id', validateObjectId('id'), deleteNote);
router.put('/:id', validateObjectId('id'), updateNote);

module.exports = router;
