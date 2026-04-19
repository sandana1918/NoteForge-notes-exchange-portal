# NoteForge Notes Exchange Portal

NoteForge is a student notes exchange portal where students can discover, upload, preview, download, and vote on academic resources such as lecture notes, previous year question papers, study guides, lab manuals, assignments, images, PDFs, text files, Word documents, and PowerPoint files.

## Highlights

- Public landing page with protected student library.
- Login and signup flow with JWT authentication.
- Notes library with search, filters, sorting, votes, previews, and downloads.
- Upload workflow with title, subject, code, semester, branch, category, academic year, tags, description, and file validation.
- Dashboard for user profile, personal uploads, impact metrics, preview, download, and delete.
- File preview modal for PDF, image, TXT, and extracted PPTX slide text.
- Seed script with demo student and sample notes for search/filter testing.

## Tech Used

- JavaScript
- React.js
- Node.js
- Express.js
- MongoDB
- Mongoose
- REST APIs
- MVC backend structure
- Middleware for auth, uploads, validation, and errors

## Folder Structure

```text
NoteForge-notes-exchange-portal/
  backend/
    config/
    controllers/
    middleware/
    models/
    routes/
    uploads/
    seed.js
    server.js
  client/
    src/
      assets/
      App.jsx
      main.jsx
      styles.css
  docs/
  README.md
```

## Requirements

- Node.js
- MongoDB running locally or hosted MongoDB URI
- npm

## Environment Setup

Create `backend/.env` from `backend/.env.example`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/student_notes_exchange
JWT_SECRET=change_this_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Create `client/.env` from `client/.env.example`:

```env
VITE_API_URL=http://localhost:5000
```

## Install

```bash
npm install
npm run install:all
```

## Seed Demo Data

```bash
npm --prefix backend run seed
```

Demo login:

```text
demo@student.local
demo123
```

## Run Project

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:5000
```

## Build

```bash
npm run build
```

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `DELETE /api/auth/delete`
- `GET /api/notes`
- `GET /api/notes/stats/overview`
- `GET /api/notes/my/uploads`
- `POST /api/notes/uploads`
- `GET /api/notes/:id`
- `GET /api/notes/:id/file`
- `GET /api/notes/:id/preview`
- `GET /api/notes/:id/download`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`
- `POST /api/votes/:noteId`
- `GET /api/search?q=term`

## Assets And Documentation

- Logo: `client/src/assets/logo.svg`
- Project docs: `docs/`
- Demo/video links can be added in `docs/VIDEO_LINKS.md` after recording.

## Notes

- `.env`, logs, local database files, uploaded files, build output, and dependencies are ignored by git.
- Seed data is generated through `backend/seed.js` instead of committing uploaded files.
