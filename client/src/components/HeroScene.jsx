export default function HeroScene() {
  return (
    <div className="hero-canvas-shell notebook-scene" aria-hidden="true">
      <div className="notebook-glow notebook-glow-one" />
      <div className="notebook-glow notebook-glow-two" />

      <div className="notebook-stage">
        <div className="floating-chip chip-dbms">
          <small>CS501</small>
          <strong>DBMS Unit 4</strong>
          <span>Normalization, BCNF, SQL</span>
        </div>

        <div className="floating-chip chip-os">
          <small>CS502</small>
          <strong>OS PYQ 2025</strong>
          <span>Deadlocks, paging, scheduling</span>
        </div>

        <div className="floating-chip chip-thermo">
          <small>ME305</small>
          <strong>Thermo Formula</strong>
          <span>Cycles, entropy, steam tables</span>
        </div>

        <div className="notebook-3d">
          <div className="notebook-shadow" />
          <div className="notebook-back" />
          <div className="notebook-spine" />

          <div className="notebook-page page-4">
            <div className="page-lines warm">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="notebook-page page-3">
            <div className="page-lines mint">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="notebook-page page-2">
            <div className="page-lines coral">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="notebook-page page-1">
            <div className="page-lines violet">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="notebook-cover">
            <div className="cover-mark">NF</div>
            <p>NoteForge</p>
            <h3>Student Notes Vault</h3>
            <div className="cover-rule" />
            <div className="cover-rule short" />
          </div>
        </div>
      </div>
    </div>
  );
}
