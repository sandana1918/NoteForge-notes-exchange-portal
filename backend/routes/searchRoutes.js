const express = require('express');
const router = express.Router();
const searchDocuments = require('../controllers/searchController');
const protect = require('../middleware/authMiddleware');

router.get('/', protect, searchDocuments);

module.exports = router;
