const mongoose = require('mongoose');

const validateObjectId = (paramName) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    res.status(400);
    return next(new Error('Invalid id'));
  }

  next();
};

module.exports = validateObjectId;
