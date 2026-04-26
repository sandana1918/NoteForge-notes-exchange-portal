const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  createLiveNote,
  getMyLiveNotes,
  getOwnLiveNote,
  getSharedLiveNote,
  updateLiveNote,
  deleteLiveNote
} = require('../controllers/liveNoteController');

router.get('/share/:shareId', getSharedLiveNote);
router.use(protect);
router.get('/', getMyLiveNotes);
router.post('/', createLiveNote);
router.get('/:shareId', getOwnLiveNote);
router.put('/:shareId', updateLiveNote);
router.delete('/:shareId', deleteLiveNote);

module.exports = router;
