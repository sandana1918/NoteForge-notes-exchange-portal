const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRouter = require('./routes/authRoutes');
const noteRouter = require('./routes/noteRoutes');
const voteRouter = require('./routes/voteRoutes');
const searchRouter = require('./routes/searchRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true,
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Student Notes Exchange API' });
});

app.use('/api/auth', authRouter);
app.use('/api/notes', noteRouter);
app.use('/api/votes', voteRouter);
app.use('/api/search', searchRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
