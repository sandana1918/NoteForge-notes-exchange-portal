import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import HeroScene from './components/HeroScene.jsx';
import api, { API_URL, authHeader } from './lib/api.js';
import logo from './assets/logo.svg';

const categories = ['Lecture Notes', 'Question Paper', 'Study Guide', 'Lab Manual', 'Assignment', 'Other'];
const branches = ['Computer Science', 'Information Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'MBA', 'Mathematics'];
const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
const landingStats = [
  { label: 'resource types', value: '6+' },
  { label: 'smart filters', value: '5' },
  { label: 'locked library', value: '100%' },
  { label: 'campus ready', value: '24/7' }
];
const landingFeatures = [
  ['Structured uploads', 'Every file needs subject, code, branch, semester, category, year and tags. No messy dumping.'],
  ['Protected vault', 'Students can see landing page publicly, but notes, previews, votes and downloads need login.'],
  ['Quality ranking', 'Upvotes and downvotes push useful material higher so juniors find clean resources first.'],
  ['Academic search', 'Search title, subject and subject code. Filter by branch, semester, category and popularity.'],
  ['Contributor dashboard', 'Each student can track uploaded files, downloads, votes and delete their own content.'],
  ['Live note links', 'Create a live note, keep typing, and share a public link so others can watch updates in real time.']
];
const previewCards = [
  ['DBMS Unit 4', 'Normalization, BCNF, SQL', 'CS501'],
  ['OS PYQ 2025', 'Deadlocks, paging, scheduling', 'CS502'],
  ['Thermo Formula Sheet', 'Cycles, entropy, steam tables', 'ME305']
];
const initialUpload = {
  title: '',
  subject: '',
  subjectCode: '',
  semester: '5',
  branch: 'Computer Science',
  category: 'Lecture Notes',
  academicYear: '2025-26',
  description: '',
  tags: '',
  file: null
};
const initialAuth = { name: '', email: '', password: '', college: '', branch: '', semester: '' };
const initialLiveNote = { title: 'Untitled Live Note', content: '<p><br></p>' };

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const sanitizeLiveHtml = (value) => {
  const html = String(value || '');
  if (typeof window === 'undefined') return html;

  const doc = new window.DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const attrName = attribute.name.toLowerCase();
      const attrValue = String(attribute.value || '').trim().toLowerCase();
      if (attrName.startsWith('on')) node.removeAttribute(attribute.name);
      if ((attrName === 'href' || attrName === 'src') && attrValue.startsWith('javascript:')) node.removeAttribute(attribute.name);
    });
  });
  return doc.body.innerHTML;
};

const plainTextToLiveHtml = (value) => {
  const text = String(value || '').trim();
  if (!text) return '<p><br></p>';
  return text
    .split(/\n{2,}/)
    .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, '<br>')}</p>`)
    .join('');
};

const normalizeLiveContent = (value) => {
  const text = String(value || '');
  if (!text.trim()) return '<p><br></p>';
  if (/<[a-z][\s\S]*>/i.test(text)) return sanitizeLiveHtml(text);
  return plainTextToLiveHtml(text);
};

const insertHtmlAtCursor = (html) => {
  document.execCommand('insertHTML', false, html);
};

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sne_user')) || null;
    } catch {
      return null;
    }
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(initialAuth);
  const [toast, setToast] = useState('');

  const token = user?.token;

  const flash = (message) => {
    setToast(message);
    window.clearTimeout(window.__noteForgeToast);
    window.__noteForgeToast = window.setTimeout(() => setToast(''), 3000);
  };

  const request = async (config) => {
    try {
      const response = await api(config);
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Request failed');
    }
  };

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    const payload = authMode === 'login'
      ? { email: authForm.email, password: authForm.password }
      : authForm;

    try {
      const data = await request({
        url: `/api/auth/${authMode === 'login' ? 'login' : 'register'}`,
        method: 'POST',
        data: payload
      });
      setUser(data);
      localStorage.setItem('sne_user', JSON.stringify(data));
      setAuthOpen(false);
      navigate('/portal');
      flash(authMode === 'login' ? 'Logged in.' : 'Account created.');
    } catch (err) {
      flash(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('sne_user');
    setUser(null);
    navigate('/');
    flash('Logged out.');
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage openAuth={openAuth} />} />
        <Route
          path="/portal"
          element={user ? <PortalPage user={user} token={token} logout={logout} flash={flash} request={request} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/workspace/:shareId"
          element={user ? <LiveWorkspacePage user={user} token={token} flash={flash} request={request} /> : <Navigate to="/" replace />}
        />
        <Route path="/live/:shareId" element={<SharedLiveNotePage flash={flash} />} />
        <Route path="*" element={<Navigate to={user ? '/portal' : '/'} replace />} />
      </Routes>
      {authOpen && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          form={authForm}
          setForm={setAuthForm}
          onSubmit={handleAuth}
          onClose={() => setAuthOpen(false)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function LandingPage({ openAuth }) {
  return (
    <div className="app-shell landing-shell">
      <Background />
      <header className="nav landing-nav">
        <a className="brand" href="#top">
          <img src={logo} alt="NoteForge logo" />
          <span>NoteForge</span>
        </a>
        <nav className="nav-links landing-links">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#subjects">Subjects</a>
          <a href="#standards">Trust</a>
        </nav>
        <div className="nav-actions">
          <button className="ghost-button" onClick={() => openAuth('login')}>Login</button>
          <button className="primary-button compact" onClick={() => openAuth('register')}>Sign Up</button>
        </div>
      </header>
      <main>
        <section className="landing-hero" id="top">
          <div className="hero-copy reveal-up">
            <p className="eyebrow">Student notes exchange portal</p>
            <h1>Share notes. Find answers. Study ahead.</h1>
            <p className="hero-text">
              Centralized study resources for college students. Upload notes, previous year papers and guides.
              Search by branch, semester and subject code. Open shared live notes through a link.
            </p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => openAuth('register')}>Create Student Account</button>
              <button className="secondary-button" onClick={() => openAuth('login')}>Enter Library</button>
            </div>
            <div className="trust-row">
              <span>Lecture notes</span>
              <span>Question papers</span>
              <span>Study guides</span>
              <span>Live notes</span>
              <span>Peer ranked</span>
            </div>
          </div>
          <div className="landing-visual reveal-up delay-1">
            <HeroScene />
          </div>
        </section>
        <section className="landing-metrics">
          {landingStats.map((item) => (
            <div className="metric-card" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </section>
        <section className="landing-section" id="features">
          <SectionTitle eyebrow="Built for campus" title="More than upload and download." text="Core portal features now match the document and add live note sharing." />
          <div className="feature-grid">
            {landingFeatures.map(([title, text]) => (
              <article className="feature-card" key={title}>
                <span></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-section split-info" id="workflow">
          <div>
            <p className="eyebrow">Simple flow</p>
            <h2>Discover first. Log in when you are ready to study.</h2>
            <p className="hero-text">
              Students register, log in, browse by branch and semester, search by subject code,
              upload material, vote on quality, and open a live shared notepad.
            </p>
            <button className="primary-button" onClick={() => openAuth('login')}>Unlock Portal</button>
          </div>
          <div className="timeline-card">
            {['Register or login', 'Upload PDF or image notes', 'Search by subject code', 'Browse branch and semester', 'Vote on quality', 'Create live note link'].map((step, index) => (
              <div className="timeline-row" key={step}>
                <strong>{index + 1}</strong>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="landing-section" id="subjects">
          <SectionTitle eyebrow="Search surfaces" title="Subjects, branches and categories are first-class." text="Seeded database includes demo material across multiple departments so filters feel real immediately." />
          <div className="subject-cloud">
            {[...branches, ...categories, 'DBMS', 'Operating Systems', 'Thermodynamics', 'Surveying', 'Marketing', 'Electrical Machines'].map((item) => (
              <button key={item} onClick={() => openAuth('login')}>{item}</button>
            ))}
          </div>
        </section>
        <section className="landing-section standards-section" id="standards">
          <SectionTitle eyebrow="Trust layer" title="Built to keep the library clean." text="Protected access, file validation, voting, previews and live note links keep study material organized and useful." />
          <div className="standards-grid">
            <article>
              <h3>Protected access</h3>
              <p>Notes, search, votes, previews and downloads are available after login.</p>
            </article>
            <article>
              <h3>Useful metadata</h3>
              <p>Every document carries subject, branch, semester, category, year and tags.</p>
            </article>
            <article>
              <h3>Live note sharing</h3>
              <p>Create a public live note link. Others can watch updates as the owner types.</p>
            </article>
          </div>
        </section>
        <section className="landing-cta">
          <p className="eyebrow">Ready</p>
          <h2>Enter the vault. Search seeded notes. Write live notes.</h2>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => openAuth('register')}>Start Now</button>
            <button className="secondary-button" onClick={() => openAuth('login')}>I Have Account</button>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div>
          <a className="brand" href="#top">
            <img src={logo} alt="" />
            <span>NoteForge</span>
          </a>
          <p>Premium student notes exchange portal for college subjects.</p>
        </div>
        <div>
          <strong>Portal</strong>
          <button onClick={() => openAuth('login')}>Library</button>
          <button onClick={() => openAuth('login')}>Upload</button>
          <button onClick={() => openAuth('login')}>Live Notes</button>
        </div>
        <div>
          <strong>Resources</strong>
          <span>Lecture notes</span>
          <span>Question papers</span>
          <span>Study guides</span>
          <span>Lab manuals</span>
        </div>
      </footer>
    </div>
  );
}

function PortalPage({ user, token, logout, flash, request }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'explore';
  const [notes, setNotes] = useState([]);
  const [stats, setStats] = useState({ totals: {}, categoryBreakdown: [], branchBreakdown: [], recent: [] });
  const [myNotes, setMyNotes] = useState([]);
  const [liveNotes, setLiveNotes] = useState([]);
  const [filters, setFilters] = useState({ q: '', semester: '', branch: '', category: '', subjectCode: '', sort: 'popular' });
  const [uploadForm, setUploadForm] = useState(initialUpload);
  const [liveDraft, setLiveDraft] = useState(initialLiveNote);
  const [previewNote, setPreviewNote] = useState(null);
  const [loading, setLoading] = useState(false);

  const headers = useMemo(() => authHeader(token), [token]);

  const loadStats = async () => {
    setStats(await request({ url: '/api/notes/stats/overview', headers }));
  };

  const loadNotes = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const data = await request({ url: '/api/notes', headers, params });
      setNotes(data.notes || []);
    } catch (err) {
      flash(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMine = async () => {
    try {
      const [ownNotes, ownLive] = await Promise.all([
        request({ url: '/api/notes/my/uploads', headers }),
        request({ url: '/api/live-notes', headers })
      ]);
      setMyNotes(ownNotes || []);
      setLiveNotes(ownLive || []);
    } catch (err) {
      flash(err.message);
    }
  };

  useEffect(() => {
    loadStats();
    loadMine();
  }, []);

  useEffect(() => {
    if (tab === 'explore') loadNotes();
  }, [filters, tab]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadForm.file) return flash('Pick file.');
    const formData = new FormData();
    Object.entries(uploadForm).forEach(([key, value]) => {
      if (value !== null && value !== '') formData.append(key, value);
    });

    try {
      await request({ url: '/api/notes/uploads', method: 'POST', headers, data: formData });
      setUploadForm(initialUpload);
      flash('Uploaded.');
      setSearchParams({ tab: 'dashboard' });
      loadStats();
      loadMine();
      loadNotes();
    } catch (err) {
      flash(err.message);
    }
  };

  const vote = async (noteId, voteType) => {
    try {
      const data = await request({ url: `/api/votes/${noteId}`, method: 'POST', headers, data: { voteType } });
      const updater = (items) => items.map((note) => note._id === noteId ? { ...note, upvotes: data.upvotes, downvotes: data.downvotes } : note);
      setNotes(updater);
      setMyNotes(updater);
    } catch (err) {
      flash(err.message);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await request({ url: `/api/notes/${noteId}`, method: 'DELETE', headers });
      setNotes((items) => items.filter((note) => note._id !== noteId));
      setMyNotes((items) => items.filter((note) => note._id !== noteId));
      loadStats();
      flash('Deleted.');
    } catch (err) {
      flash(err.message);
    }
  };

  const downloadFile = (note) => {
    const anchor = document.createElement('a');
    anchor.href = `${API_URL}/api/notes/${note._id}/download?token=${encodeURIComponent(token)}`;
    anchor.download = note.originalName || note.fileName || 'note-file';
    anchor.target = '_blank';
    anchor.click();
  };

  const createLiveNote = async (event) => {
    event.preventDefault();
    try {
      const note = await request({ url: '/api/live-notes', method: 'POST', headers, data: liveDraft });
      setLiveDraft(initialLiveNote);
      flash('Live note created.');
      loadMine();
      navigate(`/workspace/${note.shareId}`);
    } catch (err) {
      flash(err.message);
    }
  };

  const deleteLiveNote = async (shareId) => {
    try {
      await request({ url: `/api/live-notes/${shareId}`, method: 'DELETE', headers });
      setLiveNotes((items) => items.filter((item) => item.shareId !== shareId));
      flash('Live note deleted.');
    } catch (err) {
      flash(err.message);
    }
  };

  return (
    <div className="app-shell portal-shell">
      <Background />
      <header className="nav portal-nav">
        <Link className="brand" to="/portal">
          <img src={logo} alt="NoteForge logo" />
          <span>NoteForge</span>
        </Link>
        <nav className="nav-links">
          {['explore', 'upload', 'dashboard', 'live'].map((item) => (
            <button key={item} className={tab === item ? 'active' : ''} onClick={() => setSearchParams({ tab: item })}>
              {item === 'explore' ? 'Library' : item === 'upload' ? 'Upload' : item === 'dashboard' ? 'Dashboard' : 'Live Notes'}
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          <span className="user-pill">{user.name}</span>
          <button className="ghost-button" onClick={logout}>Logout</button>
        </div>
      </header>
      <main className="portal-main">
        {tab === 'explore' && (
          <section className="portal-section reveal-up">
            <PortalHero stats={stats} user={user} onUpload={() => setSearchParams({ tab: 'upload' })} />
            <WorkflowStrip />
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Secure library</p>
                <h2>Find notes fast.</h2>
              </div>
              <button className="secondary-button" onClick={loadNotes}>Refresh</button>
            </div>
            <FilterDeck filters={filters} setFilters={setFilters} />
            {loading ? <div className="empty-state">Loading documents...</div> : <NotesGrid notes={notes} onVote={vote} onOpen={setPreviewNote} onDownload={downloadFile} />}
          </section>
        )}
        {tab === 'upload' && (
          <section className="portal-section reveal-up">
            <div className="split-stage">
              <div className="upload-copy">
                <p className="eyebrow">Contributor studio</p>
                <h2>Share useful material. Add metadata.</h2>
                <p>Upload notes with title, subject, subject code, semester, branch, category and description. Search by subject code later.</p>
                <div className="quality-list">
                  <span>PDF</span>
                  <span>Image</span>
                  <span>PPT</span>
                  <span>DOC</span>
                  <span>Peer ranked</span>
                </div>
              </div>
              <UploadForm form={uploadForm} setForm={setUploadForm} onSubmit={handleUpload} />
            </div>
          </section>
        )}
        {tab === 'dashboard' && (
          <section className="portal-section reveal-up">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Student cockpit</p>
                <h2>Your impact.</h2>
              </div>
              <button className="primary-button compact" onClick={() => setSearchParams({ tab: 'upload' })}>New Upload</button>
            </div>
            <Dashboard user={user} stats={stats} myNotes={myNotes} onOpen={setPreviewNote} onDelete={deleteNote} />
          </section>
        )}
        {tab === 'live' && (
          <section className="portal-section reveal-up">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Live notes</p>
                <h2>Type now. Share link now.</h2>
              </div>
            </div>
            <div className="live-grid">
              <form className="live-create-card" onSubmit={createLiveNote}>
                <label>
                  Title
                  <input value={liveDraft.title} onChange={(e) => setLiveDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Exam prep note" />
                </label>
                <label>
                  Starter content
                  <textarea value={liveDraft.content} onChange={(e) => setLiveDraft((prev) => ({ ...prev, content: e.target.value }))} placeholder="Start typing..." />
                </label>
                <button className="primary-button wide" type="submit">Create Live Note</button>
              </form>
              <div className="live-list-card">
                {liveNotes.length === 0 ? (
                  <div className="empty-state">No live notes yet.</div>
                ) : (
                  liveNotes.map((note) => (
                    <article className="live-note-card" key={note.shareId}>
                      <div>
                        <strong>{note.title}</strong>
                        <span>{new Date(note.updatedAt).toLocaleString()}</span>
                      </div>
                      <div className="card-actions">
                        <button onClick={() => navigate(`/workspace/${note.shareId}`)}>Open</button>
                        <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/live/${note.shareId}`)}>Copy Link</button>
                        <button onClick={() => deleteLiveNote(note.shareId)}>Delete</button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      {previewNote && <PreviewModal note={previewNote} token={token} onClose={() => setPreviewNote(null)} onDownload={downloadFile} />}
    </div>
  );
}

function LiveWorkspacePage({ user, token, flash, request }) {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [drawOpen, setDrawOpen] = useState(false);
  const socketRef = useRef(null);
  const saveTimer = useRef(null);
  const imageInputRef = useRef(null);
  const editorRef = useRef(null);
  const headers = useMemo(() => authHeader(token), [token]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await request({ url: "/api/live-notes/" + shareId, headers });
        setNote({ ...data, content: normalizeLiveContent(data.content) });
      } catch (err) {
        flash(err.message);
        navigate('/portal?tab=live');
      }
    };
    load();
  }, [shareId, headers, request, flash, navigate]);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.emit('live-note:join', { shareId });
    socket.on('live-note:update', (payload) => {
      setNote((prev) => (prev ? { ...prev, ...payload, content: normalizeLiveContent(payload.content ?? prev.content) } : prev));
    });

    return () => {
      socket.emit('live-note:leave', { shareId });
      socket.disconnect();
    };
  }, [shareId, token]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  useEffect(() => {
    if (!editorRef.current || !note) return;
    const safe = normalizeLiveContent(note.content);
    if (editorRef.current.innerHTML !== safe) editorRef.current.innerHTML = safe;
  }, [note]);

  const queueSave = (next) => {
    const payload = {
      ...next,
      title: next.title || 'Untitled Live Note',
      content: normalizeLiveContent(next.content)
    };

    setNote(payload);
    socketRef.current?.emit('live-note:edit', { shareId, title: payload.title, content: payload.content });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      request({
        url: "/api/live-notes/" + shareId,
        method: 'PUT',
        headers,
        data: { title: payload.title, content: payload.content }
      }).catch(() => {});
    }, 500);
  };

  const syncEditor = () => {
    if (!editorRef.current || !note) return;
    queueSave({ ...note, content: editorRef.current.innerHTML });
  };

  const formatEditor = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditor();
  };

  const handleBlockChange = (event) => {
    const value = event.target.value;
    if (value === 'paragraph') {
      formatEditor('formatBlock', '<p>');
      return;
    }
    formatEditor('formatBlock', `<${value}>`);
  };

  const handleImagePick = async (event) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      editorRef.current?.focus();
      insertHtmlAtCursor('<figure><img src="' + dataUrl + '" alt="' + escapeHtml(file.name) + '" /></figure><p><br></p>');
    }
    syncEditor();
    event.target.value = '';
  };

  const handleInsertDrawing = (dataUrl) => {
    editorRef.current?.focus();
    insertHtmlAtCursor('<figure><img src="' + dataUrl + '" alt="Drawing" /></figure><p><br></p>');
    syncEditor();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.origin + '/live/' + shareId);
    flash('Share link copied.');
  };

  if (!note) {
    return <div className="app-shell portal-shell"><Background /><div className="center-state">Loading live note...</div></div>;
  }

  return (
    <div className="app-shell portal-shell">
      <Background />
      <header className="nav portal-nav">
        <Link className="brand" to="/portal?tab=live">
          <img src={logo} alt="" />
          <span>NoteForge</span>
        </Link>
        <div className="nav-actions">
          <button className="secondary-button" onClick={copyLink}>Copy Share Link</button>
          <span className="user-pill">{user.name}</span>
        </div>
      </header>
      <main className="portal-main">
        <section className="portal-section reveal-up live-workspace-shell">
          <div className="workspace-header">
            <p className="eyebrow">Live editor</p>
            <input className="workspace-title" value={note.title} onChange={(e) => queueSave({ ...note, title: e.target.value })} />
            <span className="workspace-meta">Public view link updates live as you type.</span>
          </div>
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <select className="tool-select" defaultValue="paragraph" onChange={handleBlockChange}>
                <option value="paragraph">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>
              <button type="button" className="tool-button" onClick={() => formatEditor('bold')}>Bold</button>
              <button type="button" className="tool-button" onClick={() => formatEditor('italic')}>Italic</button>
              <button type="button" className="tool-button" onClick={() => formatEditor('underline')}>Underline</button>
              <button type="button" className="tool-button" onClick={() => formatEditor('insertUnorderedList')}>List</button>
              <button type="button" className="tool-button" onClick={() => formatEditor('insertOrderedList')}>Number</button>
            </div>
            <div className="toolbar-group">
              <button type="button" className="tool-button" onClick={() => formatEditor('justifyLeft')}>Left</button>
              <button type="button" className="tool-button" onClick={() => formatEditor('justifyCenter')}>Center</button>
              <button type="button" className="tool-button" onClick={() => formatEditor('justifyRight')}>Right</button>
              <label className="tool-color">
                <span>Color</span>
                <input type="color" defaultValue="#111111" onChange={(e) => formatEditor('foreColor', e.target.value)} />
              </label>
              <button type="button" className="tool-button" onClick={() => imageInputRef.current?.click()}>Image</button>
              <button type="button" className="tool-button" onClick={() => setDrawOpen(true)}>Draw</button>
              <button type="button" className="tool-button" onClick={() => formatEditor('undo')}>Undo</button>
              <button type="button" className="tool-button" onClick={() => formatEditor('removeFormat')}>Clear</button>
            </div>
          </div>
          <input ref={imageInputRef} hidden type="file" accept="image/*" multiple onChange={handleImagePick} />
          <div className="paper-shell">
            <div
              ref={editorRef}
              className="workspace-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Type notes. Paste images. Draw and insert sketches."
              onInput={syncEditor}
            />
          </div>
        </section>
      </main>
      {drawOpen && <DrawModal onClose={() => setDrawOpen(false)} onInsert={handleInsertDrawing} />}
    </div>
  );
}

function SharedLiveNotePage({ flash }) {
  const { shareId } = useParams();
  const [note, setNote] = useState(null);

  useEffect(() => {
    api.get('/api/live-notes/share/' + shareId)
      .then((response) => setNote({ ...response.data, content: normalizeLiveContent(response.data.content) }))
      .catch((err) => flash(err.response?.data?.message || 'Shared note not found'));
  }, [shareId, flash]);

  useEffect(() => {
    const socket = io(API_URL);
    socket.emit('live-note:join', { shareId });
    socket.on('live-note:update', (payload) => {
      setNote((prev) => (prev ? { ...prev, ...payload, content: normalizeLiveContent(payload.content ?? prev.content) } : prev));
    });

    return () => {
      socket.emit('live-note:leave', { shareId });
      socket.disconnect();
    };
  }, [shareId]);

  if (!note) {
    return <div className="app-shell portal-shell"><Background /><div className="center-state">Loading shared note...</div></div>;
  }

  return (
    <div className="app-shell portal-shell">
      <Background />
      <main className="portal-main">
        <section className="portal-section reveal-up shared-note-shell">
          <div className="shared-note-head">
            <Link className="brand" to="/">
              <img src={logo} alt="" />
              <span>NoteForge</span>
            </Link>
            <p className="eyebrow">Public live note</p>
            <h1>{note.title}</h1>
            <span className="workspace-meta">By {note.createdBy?.name || 'Student'} ? updates live</span>
          </div>
          <div className="paper-shell">
            <article className="shared-note-body paper-view" dangerouslySetInnerHTML={{ __html: normalizeLiveContent(note.content) }} />
          </div>
        </section>
      </main>
    </div>
  );
}

function DrawModal({ onClose, onInsert }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [brushColor, setBrushColor] = useState('#111111');
  const [brushSize, setBrushSize] = useState(4);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = 900;
    const height = 520;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDraw = (event) => {
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const point = getPoint(event);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const moveDraw = (event) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDraw = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ratio = window.devicePixelRatio || 1;
    ctx.scale(ratio, ratio);
  };

  const insertDrawing = () => {
    onInsert(canvasRef.current.toDataURL('image/png'));
    onClose();
  };

  return (
    <div className="draw-backdrop" onMouseDown={onClose}>
      <div className="draw-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="draw-controls">
          <strong>Sketch pad</strong>
          <div className="toolbar-group">
            <label className="tool-color">
              <span>Ink</span>
              <input type="color" value={brushColor} onChange={(event) => setBrushColor(event.target.value)} />
            </label>
            <label className="tool-range">
              <span>Size {brushSize}</span>
              <input type="range" min="2" max="18" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
            </label>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className="draw-surface"
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
        />
        <div className="draw-actions">
          <button type="button" className="ghost-button" onClick={clearCanvas}>Clear</button>
          <button type="button" className="secondary-button" onClick={onClose}>Close</button>
          <button type="button" className="primary-button" onClick={insertDrawing}>Insert Drawing</button>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ mode, setMode, form, setForm, onSubmit, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="auth-panel auth-modal reveal-up" onMouseDown={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <button type="button" className="close-button" onClick={onClose}>x</button>
        <img src={logo} alt="" />
        <h2>{mode === 'login' ? 'Login' : 'Create account'}</h2>
        {mode === 'register' && (
          <>
            <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="College" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
            <div className="two-col">
              <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                <option value="">Branch</option>
                {branches.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                <option value="">Semester</option>
                {semesters.map((item) => <option key={item} value={item}>Sem {item}</option>)}
              </select>
            </div>
          </>
        )}
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="primary-button wide" type="submit">{mode === 'login' ? 'Enter Portal' : 'Create Account'}</button>
        <button type="button" className="switch-auth" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Need signup?' : 'Have account?'}</button>
        <p className="demo-login">Demo: demo@student.local / demo123</p>
      </form>
    </div>
  );
}

function PreviewModal({ note, token, onClose, onDownload }) {
  const [officePreview, setOfficePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileUrl = `${API_URL}/api/notes/${note._id}/file?token=${encodeURIComponent(token)}`;
  const fileType = note.fileType || '';
  const isPdf = fileType.includes('pdf');
  const isImage = fileType.includes('image');
  const isText = fileType.includes('text');
  const isOffice = fileType.includes('presentation') || fileType.includes('powerpoint') || fileType.includes('word');
  const isPptx = fileType.includes('presentationml') || String(note.fileName || '').toLowerCase().endsWith('.pptx');

  useEffect(() => {
    if (!isPptx) return;
    setPreviewLoading(true);
    api.get(`/api/notes/${note._id}/preview`, { params: { token } })
      .then((response) => setOfficePreview(response.data))
      .catch(() => setOfficePreview({ supported: false, slides: [] }))
      .finally(() => setPreviewLoading(false));
  }, [isPptx, note._id, token]);

  return (
    <div className="modal-backdrop preview-backdrop" onMouseDown={onClose}>
      <section className="preview-modal reveal-up" onMouseDown={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <div>
            <p className="eyebrow">File preview</p>
            <h2>{note.title}</h2>
            <span>{note.subject} - Sem {note.semester} - {note.category}</span>
          </div>
          <button className="close-button preview-close" onClick={onClose}>x</button>
        </div>
        <div className="preview-body">
          {isPdf && <iframe title={note.title} src={fileUrl} />}
          {isImage && <img src={fileUrl} alt={note.title} />}
          {isText && <iframe title={note.title} src={fileUrl} />}
          {isPptx && <SlidePreview officePreview={officePreview} previewLoading={previewLoading} note={note} fileType={fileType} isOffice={isOffice} />}
          {!isPdf && !isImage && !isText && !isPptx && <OfficeFallback note={note} fileType={fileType} isOffice={isOffice} />}
        </div>
        <div className="preview-footer">
          <div className="note-stats">
            <span>{note.upvotes || 0} upvotes</span>
            <span>{note.downloads || 0} downloads</span>
            <span>{note.views || 0} views</span>
          </div>
          <button className="primary-button" onClick={() => onDownload(note)}>Download File</button>
        </div>
      </section>
    </div>
  );
}

function SlidePreview({ officePreview, previewLoading, note, fileType, isOffice }) {
  if (previewLoading) return <div className="slides-preview"><div className="empty-state">Building slide preview...</div></div>;
  if (!officePreview?.supported || officePreview.slides.length === 0) return <OfficeFallback note={note} fileType={fileType} isOffice={isOffice} />;
  return (
    <div className="slides-preview">
      <div className="slides-summary">
        <strong>{officePreview.slideCount} slides found</strong>
        <span>Text preview extracted from the presentation.</span>
      </div>
      <div className="slide-list">
        {officePreview.slides.map((slide) => (
          <article className="slide-card" key={slide.number}>
            <span>Slide {slide.number}</span>
            <h3>{slide.title}</h3>
            {slide.bullets.length > 0 && (
              <ul>
                {slide.bullets.map((bullet, index) => <li key={`${slide.number}-${index}`}>{bullet}</li>)}
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function OfficeFallback({ note, fileType, isOffice }) {
  return (
    <div className="office-preview">
      <div className="file-orb">FILE</div>
      <h3>{isOffice ? 'Office file preview is limited in browser.' : 'Preview not available for this file type.'}</h3>
      <p>{note.originalName || note.fileName}</p>
      <span>{fileType || 'Unknown file type'}</span>
    </div>
  );
}

function Background() { return <><div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="grid-noise" /></>; }
function SectionTitle({ eyebrow, title, text }) { return <div className="section-title"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{text}</p></div>; }
function PortalHero({ stats, user, onUpload }) {
  return (
    <div className="portal-hero">
      <div>
        <p className="eyebrow">Welcome, {user.name}</p>
        <h1>Study smarter. Share cleaner.</h1>
        <p className="hero-text">Search by subject code, browse branch and semester, vote on useful notes, and launch a live public note link.</p>
        <div className="hero-actions">
          <button className="primary-button" onClick={onUpload}>Upload Notes</button>
          <a className="secondary-button link-button" href="#library-grid">Browse Now</a>
        </div>
      </div>
      <div className="metrics-panel small-metrics">
        <Metric label="Documents" value={stats.totals?.notes || 0} />
        <Metric label="Downloads" value={stats.totals?.downloads || 0} />
        <Metric label="Views" value={stats.totals?.views || 0} />
        <Metric label="Upvotes" value={stats.totals?.upvotes || 0} />
      </div>
    </div>
  );
}
function WorkflowStrip() { return <div className="workflow-strip">{['Login', 'Browse', 'Upload', 'Vote', 'Share', 'Track'].map((item, index) => <div className="workflow-step" key={item}><strong>0{index + 1}</strong><span>{item}</span></div>)}</div>; }
function FilterDeck({ filters, setFilters }) {
  return (
    <div className="filter-deck">
      <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search title, subject, tags..." />
      <input value={filters.subjectCode} onChange={(e) => setFilters({ ...filters, subjectCode: e.target.value })} placeholder="Search subject code..." />
      <select value={filters.semester} onChange={(e) => setFilters({ ...filters, semester: e.target.value })}>
        <option value="">All semesters</option>
        {semesters.map((item) => <option key={item} value={item}>Sem {item}</option>)}
      </select>
      <select value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}>
        <option value="">All branches</option>
        {branches.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
        <option value="">All types</option>
        {categories.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
        <option value="popular">Popular</option>
        <option value="latest">Latest</option>
        <option value="downloads">Downloads</option>
        <option value="views">Views</option>
      </select>
    </div>
  );
}
function UploadForm({ form, setForm, onSubmit }) {
  return (
    <form className="upload-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="DBMS Unit 4 Notes" /></label>
        <label>Subject<input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Database Management" /></label>
        <label>Subject code<input value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value })} placeholder="CS501" /></label>
        <label>Semester<select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>{semesters.map((item) => <option key={item} value={item}>Sem {item}</option>)}</select></label>
        <label>Branch<select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>{branches.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Type<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Academic year<input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-26" /></label>
        <label>Tags<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="exam, unit-4, important" /></label>
      </div>
      <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mention units, chapters, source and usefulness." /></label>
      <label className="drop-zone"><input required type="file" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} /><span>{form.file ? form.file.name : 'Drop file or choose one'}</span></label>
      <button className="primary-button wide" type="submit">Publish Resource</button>
    </form>
  );
}
function Dashboard({ user, stats, myNotes, onOpen, onDelete }) {
  const totals = myNotes.reduce((acc, note) => ({
    uploads: acc.uploads + 1,
    downloads: acc.downloads + (note.downloads || 0),
    upvotes: acc.upvotes + (note.upvotes || 0)
  }), { uploads: 0, downloads: 0, upvotes: 0 });

  return (
    <div className="dashboard-grid">
      <div className="profile-card">
        <img src={logo} alt="" />
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        <span>{user.college || 'College not set'}</span>
        <span>{user.branch || 'Branch not set'} {user.semester ? `- Sem ${user.semester}` : ''}</span>
      </div>
      <div className="impact-grid">
        <Metric label="Your uploads" value={totals.uploads} />
        <Metric label="Your downloads" value={totals.downloads} />
        <Metric label="Your upvotes" value={totals.upvotes} />
        <Metric label="Portal files" value={stats.totals?.notes || 0} />
      </div>
      <div className="my-notes">
        {myNotes.length === 0 ? <div className="empty-state">No uploads yet.</div> : myNotes.map((note) => (
          <article className="mini-note" key={note._id}>
            <div>
              <strong>{note.title}</strong>
              <span>{note.subject} - Sem {note.semester} - {note.category}</span>
            </div>
            <div className="mini-actions">
              <button onClick={() => onOpen(note)}>Open</button>
              <button onClick={() => onDelete(note._id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
function Metric({ label, value }) { return <div className="metric-card"><strong>{Number.isFinite(Number(value)) ? Number(value || 0).toLocaleString() : value}</strong><span>{label}</span></div>; }
function NotesGrid({ notes, onVote, onOpen, onDownload }) {
  if (!notes.length) return <div className="empty-state" id="library-grid">No notes found. Try seeded search: DBMS, CS501, OS, Thermodynamics.</div>;
  return (
    <div className="notes-grid" id="library-grid">
      {notes.map((note, index) => (
        <article className="note-card" key={note._id} style={{ '--delay': `${index * 45}ms` }}>
          <div className="note-topline"><span>{note.category || 'Lecture Notes'}</span><span>Sem {note.semester}</span></div>
          <h3>{note.title}</h3>
          <p>{note.description || 'Student resource ready for revision.'}</p>
          <div className="note-meta"><span>{note.subject}</span><span>{note.branch}</span>{note.subjectCode && <span>{note.subjectCode}</span>}</div>
          <div className="tag-row">{(note.tags || []).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className="note-stats"><span>{note.upvotes || 0} up</span><span>{note.downvotes || 0} down</span><span>{note.downloads || 0} downloads</span></div>
          <div className="card-actions">
            <button onClick={() => onVote(note._id, 'upvote')}>Up</button>
            <button onClick={() => onVote(note._id, 'downvote')}>Down</button>
            <button onClick={() => onOpen(note)}>Preview</button>
            <button className="download" onClick={() => onDownload(note)}>Download</button>
          </div>
          <div className="uploader">By {note.uploadedBy?.name || 'Student'}</div>
        </article>
      ))}
    </div>
  );
}

export default App;
