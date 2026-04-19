import { useEffect, useMemo, useState } from 'react';
import logo from './assets/logo.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const categories = ['Lecture Notes', 'Question Paper', 'Study Guide', 'Lab Manual', 'Assignment', 'Other'];
const branches = ['Computer Science', 'Information Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'MBA', 'Mathematics'];
const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
const landingStats = [{ label: 'resource types', value: '6+' }, { label: 'smart filters', value: '5' }, { label: 'locked library', value: '100%' }, { label: 'campus ready', value: '24/7' }];
const landingFeatures = [
  ['Structured uploads', 'Every file needs subject, code, branch, semester, category, year and tags. No messy dumping.'],
  ['Protected vault', 'Students can see landing page publicly, but notes, previews, votes and downloads need login.'],
  ['Quality ranking', 'Upvotes and downvotes push useful material higher so juniors find clean resources first.'],
  ['Academic search', 'Search title, subject, subject code and tags. Filter by branch, semester, category and popularity.'],
  ['Contributor dashboard', 'Each student can track uploaded files, downloads, votes and delete their own content.'],
  ['Clean sharing rules', 'Useful details, guarded access and owner controls keep the library organized as it grows.']
];
const previewCards = [
  ['DBMS Unit 4', 'Normalization, BCNF, SQL', 'CS501'],
  ['OS PYQ 2025', 'Deadlocks, paging, scheduling', 'CS502'],
  ['Thermo Formula Sheet', 'Cycles, entropy, steam tables', 'ME305']
];
const initialUpload = { title: '', subject: '', subjectCode: '', semester: '5', branch: 'Computer Science', category: 'Lecture Notes', academicYear: '2025-26', description: '', tags: '', file: null };
const initialAuth = { name: '', email: '', password: '', college: '', branch: '', semester: '' };

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sne_user')) || null; } catch { return null; }
  });
  const [notes, setNotes] = useState([]);
  const [stats, setStats] = useState({ totals: {}, categoryBreakdown: [], branchBreakdown: [], recent: [] });
  const [myNotes, setMyNotes] = useState([]);
  const [filters, setFilters] = useState({ q: '', semester: '', branch: '', category: '', sort: 'popular' });
  const [activeView, setActiveView] = useState('explore');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(initialAuth);
  const [uploadForm, setUploadForm] = useState(initialUpload);
  const [previewNote, setPreviewNote] = useState(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  const token = user?.token;
  const authHeaders = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  const flash = (message) => {
    setToast(message);
    window.clearTimeout(window.__noteForgeToast);
    window.__noteForgeToast = window.setTimeout(() => setToast(''), 2800);
  };

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, options);
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) throw new Error(data?.message || 'Request failed');
    return data;
  };

  const saveUser = (data) => {
    setUser(data);
    localStorage.setItem('sne_user', JSON.stringify(data));
  };

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    try {
      const payload = authMode === 'login' ? { email: authForm.email, password: authForm.password } : authForm;
      const data = await request(`/api/auth/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      saveUser(data);
      setAuthOpen(false);
      setActiveView('explore');
      flash(authMode === 'login' ? 'Logged in.' : 'Signup done.');
    } catch (err) {
      flash(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('sne_user');
    setUser(null);
    setNotes([]);
    setMyNotes([]);
    setStats({ totals: {}, categoryBreakdown: [], branchBreakdown: [], recent: [] });
    flash('Logged out.');
  };

  const loadStats = async () => {
    if (!token) return;
    try { setStats(await request('/api/notes/stats/overview', { headers: authHeaders })); } catch (err) { flash(err.message); }
  };

  const loadNotes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
      const data = await request(`/api/notes?${params.toString()}`, { headers: authHeaders });
      setNotes(data.notes || []);
    } catch (err) {
      flash(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMyNotes = async () => {
    if (!token) return;
    try { setMyNotes(await request('/api/notes/my/uploads', { headers: authHeaders }) || []); } catch (err) { flash(err.message); }
  };

  useEffect(() => { if (token) { loadStats(); loadMyNotes(); } }, [token]);
  useEffect(() => { if (token) loadNotes(); }, [filters, token]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadForm.file) return flash('Pick file.');
    const formData = new FormData();
    Object.entries(uploadForm).forEach(([key, value]) => { if (value !== null && value !== '') formData.append(key, value); });
    try {
      await request('/api/notes/uploads', { method: 'POST', headers: authHeaders, body: formData });
      setUploadForm(initialUpload);
      setActiveView('dashboard');
      flash('Uploaded.');
      loadNotes(); loadStats(); loadMyNotes();
    } catch (err) { flash(err.message); }
  };

  const vote = async (noteId, voteType) => {
    try {
      const data = await request(`/api/votes/${noteId}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ voteType }) });
      const update = (items) => items.map((note) => note._id === noteId ? { ...note, upvotes: data.upvotes, downvotes: data.downvotes } : note);
      setNotes(update); setMyNotes(update);
    } catch (err) { flash(err.message); }
  };

  const openFile = async (note) => {
    setPreviewNote(note);
  };

  const downloadFile = async (note) => {
    try {
      const anchor = document.createElement('a');
      anchor.href = `${API_URL}/api/notes/${note._id}/download?token=${encodeURIComponent(token)}`;
      anchor.download = note.originalName || note.fileName || 'note-file';
      anchor.target = '_blank';
      anchor.click();
      setNotes((items) => items.map((item) => item._id === note._id ? { ...item, downloads: (item.downloads || 0) + 1 } : item));
    } catch (err) { flash(err.message); }
  };

  const deleteNote = async (noteId) => {
    try {
      await request(`/api/notes/${noteId}`, { method: 'DELETE', headers: authHeaders });
      setNotes((items) => items.filter((note) => note._id !== noteId));
      setMyNotes((items) => items.filter((note) => note._id !== noteId));
      loadStats();
      flash('Deleted.');
    } catch (err) { flash(err.message); }
  };

  if (!user) {
    return (
      <>
        <Landing openAuth={openAuth} />
        {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} onSubmit={handleAuth} onClose={() => setAuthOpen(false)} />}
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  return (
    <div className="app-shell portal-shell">
      <Background />
      <header className="nav portal-nav">
        <button className="brand" onClick={() => setActiveView('explore')} aria-label="Go home"><img src={logo} alt="NoteForge logo" /><span>NoteForge</span></button>
        <nav className="nav-links"><button className={activeView === 'explore' ? 'active' : ''} onClick={() => setActiveView('explore')}>Library</button><button className={activeView === 'upload' ? 'active' : ''} onClick={() => setActiveView('upload')}>Upload</button><button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setActiveView('dashboard')}>Dashboard</button></nav>
        <div className="nav-actions"><span className="user-pill">{user.name}</span><button className="ghost-button" onClick={logout}>Logout</button></div>
      </header>
      <main className="portal-main">
        {activeView === 'explore' && <section className="portal-section library-section reveal-up"><PortalHero stats={stats} user={user} onUpload={() => setActiveView('upload')} /><WorkflowStrip /><div className="section-heading compact-heading"><div><p className="eyebrow">Secure library</p><h2>Find notes fast.</h2></div><button className="secondary-button" onClick={loadNotes}>Refresh</button></div><FilterDeck filters={filters} setFilters={setFilters} />{loading ? <div className="empty-state">Loading documents...</div> : <NotesGrid notes={notes} onVote={vote} onOpen={openFile} onDownload={downloadFile} />}</section>}
        {activeView === 'upload' && <section className="portal-section upload-section reveal-up"><div className="split-stage"><div className="upload-copy"><p className="eyebrow">Contributor studio</p><h2>Share useful material. Add metadata.</h2><p>Industry workflow: title, subject, branch, semester, category, year, tags, file. No mystery uploads.</p><div className="quality-list"><span>Clean names</span><span>25 MB max</span><span>PDF, image, TXT, DOC, PPT</span><span>Peer ranked</span></div></div><UploadForm form={uploadForm} setForm={setUploadForm} onSubmit={handleUpload} /></div></section>}
        {activeView === 'dashboard' && <section className="portal-section dashboard-section reveal-up"><div className="section-heading compact-heading"><div><p className="eyebrow">Student cockpit</p><h2>Your impact.</h2></div><button className="primary-button compact" onClick={() => setActiveView('upload')}>New Upload</button></div><Dashboard user={user} stats={stats} myNotes={myNotes} onOpen={openFile} onDelete={deleteNote} /></section>}
      </main>
      {toast && <div className="toast">{toast}</div>}
      {previewNote && <PreviewModal note={previewNote} token={token} onClose={() => setPreviewNote(null)} onDownload={downloadFile} />}
    </div>
  );
}

function Landing({ openAuth }) {
  return (
    <div className="app-shell landing-shell">
      <Background />
      <header className="nav landing-nav">
        <a className="brand" href="#top"><img src={logo} alt="NoteForge logo" /><span>NoteForge</span></a>
        <nav className="nav-links landing-links"><a href="#features">Features</a><a href="#workflow">Workflow</a><a href="#subjects">Subjects</a><a href="#standards">Trust</a></nav>
        <div className="nav-actions"><button className="ghost-button" onClick={() => openAuth('login')}>Login</button><button className="primary-button compact" onClick={() => openAuth('register')}>Sign Up</button></div>
      </header>

      <main>
        <section className="landing-hero" id="top">
          <div className="hero-copy reveal-up">
            <p className="eyebrow">Student notes exchange portal</p>
            <h1>Share notes. Find answers. Study ahead.</h1>
            <p className="hero-text">A focused campus space for lecture notes, previous year papers, study guides, lab manuals and assignments. Explore what is possible, then log in to open the student library.</p>
            <div className="hero-actions"><button className="primary-button" onClick={() => openAuth('register')}>Create Student Account</button><button className="secondary-button" onClick={() => openAuth('login')}>Enter Library</button></div>
            <div className="trust-row"><span>Lecture notes</span><span>Question papers</span><span>Study guides</span><span>Lab manuals</span><span>Peer ranked</span></div>
          </div>
          <div className="landing-visual reveal-up delay-1">
            <div className="vault-card main-vault"><img src={logo} alt="" /><strong>Locked Notes Vault</strong><span>Login required</span></div>
            {previewCards.map((card, index) => <div className={`vault-card ghost-card card-${index}`} key={card[0]}><small>{card[2]}</small><strong>{card[0]}</strong><span>{card[1]}</span></div>)}
          </div>
        </section>

        <section className="landing-metrics">{landingStats.map((item) => <div className="metric-card" key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}</section>

        <section className="landing-section" id="features"><SectionTitle eyebrow="Built for campus" title="More than upload and download." text="The portal has the pieces expected in a proper student document-sharing product." /><div className="feature-grid">{landingFeatures.map(([title, text]) => <article className="feature-card" key={title}><span></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

        <section className="landing-section split-info" id="workflow"><div><p className="eyebrow">Simple flow</p><h2>Discover first. Log in when you are ready to study.</h2><p className="hero-text">The home page explains the library. Student accounts unlock search, previews, downloads, voting and uploads.</p><button className="primary-button" onClick={() => openAuth('login')}>Unlock Portal</button></div><div className="timeline-card">{['Open the home page', 'Sign up or login', 'Search by subject and branch', 'Preview or download files', 'Upload your own notes', 'Track impact in dashboard'].map((step, index) => <div className="timeline-row" key={step}><strong>{index + 1}</strong><span>{step}</span></div>)}</div></section>

        <section className="landing-section" id="subjects"><SectionTitle eyebrow="Search surfaces" title="Subjects, branches and categories are first-class." text="Seeded database includes demo material across multiple departments so filters feel real immediately." /><div className="subject-cloud">{[...branches, ...categories, 'DBMS', 'Operating Systems', 'Thermodynamics', 'Surveying', 'Marketing', 'Electrical Machines'].map((item) => <button key={item} onClick={() => openAuth('login')}>{item}</button>)}</div></section>

        <section className="landing-section standards-section" id="standards"><SectionTitle eyebrow="Trust layer" title="Built to keep the library clean." text="Student access, file checks, clear details and owner controls help the collection stay useful semester after semester." /><div className="standards-grid"><article><h3>Protected access</h3><p>Notes, search, votes, previews and downloads are available after login.</p></article><article><h3>Useful metadata</h3><p>Every document carries subject, branch, semester, category, year and tags.</p></article><article><h3>Student ownership</h3><p>Users can manage uploads and delete only their own resources.</p></article></div></section>

        <section className="landing-cta"><p className="eyebrow">Ready</p><h2>Enter the vault. Search seeded notes. Upload yours.</h2><div className="hero-actions"><button className="primary-button" onClick={() => openAuth('register')}>Start Now</button><button className="secondary-button" onClick={() => openAuth('login')}>I Have Account</button></div></section>
      </main>

      <footer className="footer"><div><a className="brand" href="#top"><img src={logo} alt="" /><span>NoteForge</span></a><p>Premium student notes exchange portal for college subjects.</p></div><div><strong>Portal</strong><button onClick={() => openAuth('login')}>Library</button><button onClick={() => openAuth('login')}>Upload</button><button onClick={() => openAuth('login')}>Dashboard</button></div><div><strong>Resources</strong><span>Lecture notes</span><span>Question papers</span><span>Study guides</span><span>Lab manuals</span></div></footer>
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
        {mode === 'register' && <><input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input placeholder="College" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} /><div className="two-col"><select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}><option value="">Branch</option>{branches.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}><option value="">Semester</option>{semesters.map((item) => <option key={item} value={item}>Sem {item}</option>)}</select></div></>}
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
    fetch(`${API_URL}/api/notes/${note._id}/preview?token=${encodeURIComponent(token)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Preview unavailable')))
      .then(setOfficePreview)
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
          {isPptx && (
            <div className="slides-preview">
              {previewLoading && <div className="empty-state">Building slide preview...</div>}
              {!previewLoading && officePreview?.supported && officePreview.slides.length > 0 && (
                <>
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
                </>
              )}
              {!previewLoading && (!officePreview?.supported || officePreview.slides.length === 0) && (
                <OfficeFallback note={note} fileType={fileType} isOffice={isOffice} />
              )}
            </div>
          )}
          {!isPdf && !isImage && !isText && !isPptx && (
            <OfficeFallback note={note} fileType={fileType} isOffice={isOffice} />
          )}
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
function PortalHero({ stats, user, onUpload }) { return <div className="portal-hero"><div><p className="eyebrow">Welcome, {user.name}</p><h1>Study smarter. Share cleaner.</h1><p className="hero-text">Search academic material, upload with useful metadata, and let students vote the best files upward.</p><div className="hero-actions"><button className="primary-button" onClick={onUpload}>Upload Notes</button><a className="secondary-button link-button" href="#library-grid">Browse Now</a></div></div><div className="metrics-panel small-metrics"><Metric label="Documents" value={stats.totals?.notes || 0} /><Metric label="Downloads" value={stats.totals?.downloads || 0} /><Metric label="Views" value={stats.totals?.views || 0} /><Metric label="Upvotes" value={stats.totals?.upvotes || 0} /></div></div>; }
function WorkflowStrip() { return <div className="workflow-strip">{['Login', 'Browse', 'Upload', 'Vote', 'Download', 'Track'].map((item, index) => <div className="workflow-step" key={item}><strong>0{index + 1}</strong><span>{item}</span></div>)}</div>; }
function FilterDeck({ filters, setFilters }) { return <div className="filter-deck"><input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search title, subject, code, tags..." /><select value={filters.semester} onChange={(e) => setFilters({ ...filters, semester: e.target.value })}><option value="">All semesters</option>{semesters.map((item) => <option key={item} value={item}>Sem {item}</option>)}</select><select value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}><option value="">All branches</option>{branches.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All types</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}><option value="popular">Popular</option><option value="latest">Latest</option><option value="downloads">Downloads</option><option value="views">Views</option></select></div>; }
function UploadForm({ form, setForm, onSubmit }) { return <form className="upload-form" onSubmit={onSubmit}><div className="form-grid"><label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="DBMS Unit 4 Notes" /></label><label>Subject<input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Database Management" /></label><label>Subject code<input value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value })} placeholder="CS501" /></label><label>Semester<select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>{semesters.map((item) => <option key={item} value={item}>Sem {item}</option>)}</select></label><label>Branch<select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>{branches.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Type<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Academic year<input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-26" /></label><label>Tags<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="exam, unit-4, important" /></label></div><label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mention units, chapters, source and usefulness." /></label><label className="drop-zone"><input required type="file" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} /><span>{form.file ? form.file.name : 'Drop file or choose one'}</span></label><button className="primary-button wide" type="submit">Publish Resource</button></form>; }
function Dashboard({ user, stats, myNotes, onOpen, onDelete }) { const totals = myNotes.reduce((acc, note) => ({ uploads: acc.uploads + 1, downloads: acc.downloads + (note.downloads || 0), upvotes: acc.upvotes + (note.upvotes || 0) }), { uploads: 0, downloads: 0, upvotes: 0 }); return <div className="dashboard-grid"><div className="profile-card"><img src={logo} alt="" /><h3>{user.name}</h3><p>{user.email}</p><span>{user.college || 'College not set'}</span><span>{user.branch || 'Branch not set'} {user.semester ? `- Sem ${user.semester}` : ''}</span></div><div className="impact-grid"><Metric label="Your uploads" value={totals.uploads} /><Metric label="Your downloads" value={totals.downloads} /><Metric label="Your upvotes" value={totals.upvotes} /><Metric label="Portal files" value={stats.totals?.notes || 0} /></div><div className="my-notes">{myNotes.length === 0 ? <div className="empty-state">No uploads yet.</div> : myNotes.map((note) => <article className="mini-note" key={note._id}><div><strong>{note.title}</strong><span>{note.subject} - Sem {note.semester} - {note.category}</span></div><div className="mini-actions"><button onClick={() => onOpen(note)}>Open</button><button onClick={() => onDelete(note._id)}>Delete</button></div></article>)}</div></div>; }
function Metric({ label, value }) { return <div className="metric-card"><strong>{Number.isFinite(Number(value)) ? Number(value || 0).toLocaleString() : value}</strong><span>{label}</span></div>; }
function NotesGrid({ notes, onVote, onOpen, onDownload }) { if (!notes.length) return <div className="empty-state" id="library-grid">No notes found. Try seeded search: DBMS, OS, Thermodynamics.</div>; return <div className="notes-grid" id="library-grid">{notes.map((note, index) => <article className="note-card" key={note._id} style={{ '--delay': `${index * 45}ms` }}><div className="note-topline"><span>{note.category || 'Lecture Notes'}</span><span>Sem {note.semester}</span></div><h3>{note.title}</h3><p>{note.description || 'Student resource ready for revision.'}</p><div className="note-meta"><span>{note.subject}</span><span>{note.branch}</span>{note.subjectCode && <span>{note.subjectCode}</span>}</div><div className="tag-row">{(note.tags || []).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div><div className="note-stats"><span>{note.upvotes || 0} up</span><span>{note.downvotes || 0} down</span><span>{note.downloads || 0} downloads</span></div><div className="card-actions"><button onClick={() => onVote(note._id, 'upvote')}>Up</button><button onClick={() => onVote(note._id, 'downvote')}>Down</button><button onClick={() => onOpen(note)}>Preview</button><button className="download" onClick={() => onDownload(note)}>Download</button></div><div className="uploader">By {note.uploadedBy?.name || 'Student'}</div></article>)}</div>; }

export default App;
