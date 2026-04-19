const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { castVote, getVotes } = require('../controllers/voteController');

router.post('/:noteId', protect, validateObjectId('noteId'), castVote);
router.get('/:noteId', protect, validateObjectId('noteId'), getVotes);

module.exports = router;
