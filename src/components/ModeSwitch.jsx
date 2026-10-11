import { Link } from 'react-router-dom';

// Interruptor entre el home normal y el home "Racing". Va dentro del Navbar,
// junto al logo, para poder ir y volver con un clic desde cualquiera de los dos.
const ModeSwitch = ({ active }) => (
  <div className="mode-switch" role="tablist" aria-label="Elegir versión del inicio">
    <Link
      to="/"
      role="tab"
      aria-selected={active === 'home'}
      className={`mode-tab${active === 'home' ? ' is-active' : ''}`}
    >
      Underlaw
    </Link>
    <Link
      to="/racing"
      role="tab"
      aria-selected={active === 'racing'}
      className={`mode-tab${active === 'racing' ? ' is-active' : ''}`}
    >
      <span className="mode-extra">Underlaw </span>Racing
    </Link>

    <style>{`
      .mode-switch { display: flex; align-items: center; min-width: 0; }
      .mode-tab {
        padding: 0.55rem clamp(0.7rem, 2vw, 1.2rem);
        font-size: 0.6rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--text-muted);
        border: 1px solid var(--border-strong);
        white-space: nowrap;
      }
      .mode-tab + .mode-tab { border-left: none; }
      .mode-tab:hover { color: var(--text-primary); }
      .mode-tab.is-active {
        background: var(--accent-soft);
        color: var(--text-primary);
        border-color: var(--gold);
      }
      .mode-tab.is-active + .mode-tab, .mode-tab + .mode-tab.is-active { border-left: 1px solid var(--gold); }
      @media (max-width: 480px) {
        .mode-tab { padding: 0.5rem 0.65rem; font-size: 0.56rem; letter-spacing: 0.1em; }
        .mode-extra { display: none; }
      }
    `}</style>
  </div>
);

export default ModeSwitch;
