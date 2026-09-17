// Estilos compartidos por Admin.jsx y todos los paneles (Productos, Lanzamientos,
// Secciones, Inventario) — mismas clases en cada archivo, inyectadas con un
// <style>{ADMIN_STYLES}</style> local, siguiendo el patrón que ya usa el resto
// del proyecto (Home.jsx, Products.jsx...).
export const ADMIN_STYLES = `
  .admin-login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.25rem; }
  .admin-login-card { width: 100%; max-width: 400px; padding: clamp(2rem, 5vw, 3rem); border: 1px solid var(--border); background: var(--bg-secondary); }
  .admin-login-logo { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 1.5rem; }

  .admin-page { min-height: 100vh; }
  .admin-header { position: sticky; top: 0; z-index: 50; background: rgba(6,6,6,0.9); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); }
  .admin-header-top { max-width: 1320px; margin: 0 auto; padding: 0.9rem clamp(1.1rem, 4vw, 2.5rem); display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .admin-brand { display: flex; align-items: center; gap: 0.65rem; min-width: 0; }
  .admin-brand-logo { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; display: block; }
  .admin-brand-name { margin: 0; font-family: var(--font-serif); font-size: 1.2rem; line-height: 1.1; }
  .admin-brand-sub { margin: 0; font-size: 0.56rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--text-muted); }
  .admin-header-actions { display: flex; align-items: center; gap: 0.6rem; }
  .admin-icon-btn { position: relative; background: none; border: 1px solid var(--border-strong); color: var(--text-primary); padding: 0.6rem; cursor: pointer; display: flex; }
  .admin-notif { position: relative; }
  .admin-notif-badge { position: absolute; top: -6px; right: -6px; background: var(--gold); color: var(--bg-primary); border-radius: 50%; width: 18px; height: 18px; font-size: 0.62rem; display: flex; align-items: center; justify-content: center; font-weight: 500; }
  .admin-notif-panel { position: absolute; top: calc(100% + 10px); right: 0; width: min(340px, 86vw); background: var(--bg-secondary); border: 1px solid var(--border-soft); z-index: 200; box-shadow: 0 18px 50px rgba(0,0,0,0.7); }
  .admin-notif-head { padding: 0.9rem 1.1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .admin-notif-item { padding: 0.95rem 1.1rem; border-bottom: 1px solid var(--border); display: flex; gap: 0.75rem; align-items: flex-start; }
  .admin-notif-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 7px; flex-shrink: 0; }

  .admin-tabs { max-width: 1320px; margin: 0 auto; padding: 0 clamp(1.1rem, 4vw, 2.5rem); display: flex; gap: 0.35rem; overflow-x: auto; }
  .admin-tab { flex-shrink: 0; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-muted); font-family: var(--font-sans); font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.18em; padding: 0.9rem 0.9rem 0.8rem; cursor: pointer; white-space: nowrap; }
  .admin-tab-activa { color: var(--text-primary); border-bottom-color: var(--gold); }

  .admin-content { max-width: 1320px; margin: 0 auto; padding: clamp(2rem, 5vw, 3.5rem) clamp(1.1rem, 4vw, 2.5rem) 4rem; }
  .admin-content-head { display: flex; flex-wrap: wrap; gap: 1.25rem; justify-content: space-between; align-items: flex-end; margin-bottom: clamp(2rem, 5vw, 3rem); }
  .admin-content-title { font-weight: 300; font-size: clamp(2rem, 6vw, 3.4rem); line-height: 1; letter-spacing: -0.02em; margin: 0 0 0.5rem; }
  .admin-content-sub { color: var(--text-muted); margin: 0; font-size: 0.9rem; max-width: 56ch; line-height: 1.6; }
  .admin-btn-create { display: flex; align-items: center; gap: 0.55rem; padding: 0.95rem 1.6rem; background: var(--text-primary); color: var(--bg-primary); border: none; font-family: var(--font-sans); font-size: 0.66rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.18em; cursor: pointer; white-space: nowrap; }
  .admin-btn-create:hover { opacity: 0.85; }

  .admin-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 1px; background: var(--border-soft); margin-bottom: clamp(2rem, 5vw, 3rem); }
  .admin-stat-cell { background: var(--bg-secondary); padding: 1.75rem 1.5rem; }
  .admin-stat-label { margin: 0; font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--text-muted); }
  .admin-stat-value { margin: 0.75rem 0 0; font-family: var(--font-serif); font-size: 2.6rem; line-height: 1; }

  .admin-card { border: 1px solid var(--border); background: var(--bg-secondary); }
  .admin-card-head { padding: 1.5rem clamp(1.1rem, 3vw, 2rem); border-bottom: 1px solid var(--border); }
  .admin-card-title { font-family: var(--font-serif); font-style: italic; font-weight: 300; font-size: 1.5rem; margin: 0; }
  .admin-table-wrapper { overflow-x: auto; }
  .admin-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 820px; }
  .admin-table thead tr { border-bottom: 1px solid var(--border-soft); }
  .admin-table th { padding: 1rem; font-weight: 500; font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.18em; color: var(--text-muted); }
  .admin-table th:first-child, .admin-table td:first-child { padding-left: clamp(1.1rem, 3vw, 2rem); }
  .admin-table th:last-child, .admin-table td:last-child { padding-right: clamp(1.1rem, 3vw, 2rem); }
  .admin-table tbody tr { border-bottom: 1px solid var(--border); }
  .admin-table td { padding: 1.15rem 1rem; font-size: 0.9rem; }
  .admin-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.7rem; color: var(--gold); }
  .admin-pagination { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center; padding: 1.35rem clamp(1.1rem, 3vw, 2rem); border-top: 1px solid var(--border); }
  .admin-page-btn { padding: 0.55rem 1.1rem; background: none; border: 1px solid var(--border-strong); color: var(--text-primary); font-family: var(--font-sans); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.16em; cursor: pointer; }
  .admin-page-btn:disabled { color: var(--border-strong); cursor: not-allowed; }

  .admin-link-gold { background: none; border: none; color: var(--gold); cursor: pointer; font-family: var(--font-sans); font-size: 0.78rem; padding: 0; border-bottom: 1px solid rgba(192,161,91,0.4); }
  .admin-link-muted { background: none; border: none; color: var(--text-muted); cursor: pointer; font-family: var(--font-sans); font-size: 0.78rem; padding: 0; }
  .admin-link-error { background: none; border: none; color: var(--error); cursor: pointer; font-family: var(--font-sans); font-size: 0.76rem; padding: 0; border-bottom: 1px solid rgba(181,114,110,0.4); display: flex; align-items: center; gap: 0.4rem; }
  .admin-link-gold-plain { background: none; border: none; color: var(--gold); cursor: pointer; font-family: var(--font-sans); font-size: 0.76rem; padding: 0; display: flex; align-items: center; gap: 0.4rem; }
  .admin-link-text { background: none; border: none; color: var(--text-primary); cursor: pointer; font-family: var(--font-sans); font-size: 0.76rem; padding: 0; display: flex; align-items: center; gap: 0.4rem; }

  .admin-field { display: flex; flex-direction: column; gap: 0.5rem; }
  .admin-field span { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.18em; color: var(--text-muted); }
  .admin-field input, .admin-field select, .admin-field textarea {
    background: var(--bg-primary); border: 1px solid var(--border-strong); color: var(--text-primary);
    padding: 0.75rem 1rem; font-size: 0.95rem; font-family: var(--font-sans); outline: none;
  }
  .admin-field textarea { resize: vertical; }
  .admin-field select option { background: var(--bg-secondary); color: var(--text-primary); }
  .admin-error { color: var(--error); font-size: 0.85rem; margin: 0; }

  .admin-empty { text-align: center; padding: 4rem 0; color: var(--text-dim); }
  .admin-empty svg { margin-bottom: 1rem; opacity: 0.5; }

  .admin-modal-overlay { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.82); display: flex; align-items: center; justify-content: center; padding: 1.25rem; }
  .admin-modal { width: 100%; max-width: 500px; max-height: 85vh; overflow-y: auto; background: var(--bg-secondary); border: 1px solid var(--border-soft); padding: clamp(1.75rem, 5vw, 2.5rem); }
  .admin-modal-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.75rem; }
  .admin-modal-title { font-family: var(--font-serif); font-style: italic; font-weight: 300; font-size: 1.5rem; margin: 0; }
  .admin-modal-close { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; padding: 0.25rem; }
  .admin-modal-rows { display: grid; gap: 1px; background: var(--border); }
  .admin-modal-row { background: var(--bg-secondary); padding: 0.95rem 0; display: flex; justify-content: space-between; gap: 1.25rem; }
  .admin-modal-row span:first-child { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.16em; color: var(--text-muted); flex-shrink: 0; }
  .admin-modal-row span:last-child { font-size: 0.92rem; }

  .admin-confirm-modal { width: 100%; max-width: 380px; background: var(--bg-secondary); border: 1px solid var(--border-soft); padding: clamp(1.75rem, 5vw, 2.25rem); text-align: center; }
  .admin-confirm-title { font-family: var(--font-serif); font-style: italic; font-weight: 300; font-size: 1.4rem; margin: 0 0 0.75rem; }
  .admin-confirm-text { color: var(--text-tertiary); font-size: 0.85rem; line-height: 1.7; margin: 0 0 1.75rem; }
  .admin-confirm-actions { display: flex; gap: 0.75rem; }
  .admin-confirm-cancel { flex: 1; padding: 0.85rem; background: none; border: 1px solid var(--border-strong); color: var(--text-primary); font-family: var(--font-sans); font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.16em; cursor: pointer; }
  .admin-confirm-delete { flex: 1; padding: 0.85rem; background: var(--error); border: none; color: var(--bg-primary); font-family: var(--font-sans); font-size: 0.64rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.16em; cursor: pointer; }

  .admin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: clamp(1.25rem, 3vw, 2rem); }
  .admin-tile { border: 1px solid var(--border); background: var(--bg-secondary); display: flex; flex-direction: column; }
  .admin-tile-media { aspect-ratio: 3/4; background: var(--bg-tertiary); overflow: hidden; }
  .admin-tile-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.35rem; flex: 1; }
  .admin-tile-actions { margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--border); }

  .admin-list { display: grid; gap: 1px; background: var(--border-soft); border: 1px solid var(--border); }
  .admin-list-row { background: var(--bg-secondary); padding: 1.25rem clamp(1.1rem, 3vw, 1.75rem); display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: center; }

  @media (max-width: 768px) {
    .admin-stats-grid { grid-template-columns: 1fr !important; }
  }
`;
