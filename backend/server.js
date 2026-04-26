const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRouter = require('./routes/authRoutes');
const noteRouter = require('./routes/noteRoutes');
const voteRouter = require('./routes/voteRoutes');
const searchRouter = require('./routes/searchRoutes');
const liveNoteRouter = require('./routes/liveNoteRoutes');
const LiveNote = require('./models/liveNoteModel');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true;

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Student Notes Exchange API' });
});

app.use('/api/auth', authRouter);
app.use('/api/notes', noteRouter);
app.use('/api/votes', voteRouter);
app.use('/api/search', searchRouter);
app.use('/api/live-notes', liveNoteRouter);

app.use(notFound);
app.use(errorHandler);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.userId = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    socket.userId = null;
    next();
  }
});

io.on('connection', (socket) => {
  socket.on('live-note:join', ({ shareId }) => {
    if (!shareId) return;
    socket.join(`live:${shareId}`);
  });

  socket.on('live-note:leave', ({ shareId }) => {
    if (!shareId) return;
    socket.leave(`live:${shareId}`);
  });

  socket.on('live-note:edit', async ({ shareId, title, content }) => {
    if (!shareId || !socket.userId) return;

    const note = await LiveNote.findOne({ shareId, createdBy: socket.userId });
    if (!note) return;

    if (typeof title === 'string') note.title = title.trim() || note.title;
    if (typeof content === 'string') note.content = content;
    note.lastEditedAt = new Date();
    await note.save();

    io.to(`live:${shareId}`).emit('live-note:update', {
      shareId,
      title: note.title,
      content: note.content,
      lastEditedAt: note.lastEditedAt
    });
  });
});

const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
