import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, grantConsent, denyConsent } from '../utils/analytics';

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsent() == null);
  }, []);

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Aviso de cookies">
      <p>
        Usamos analítica anónima (PostHog) para entender cómo navegas el sitio y mejorar el proceso de compra.
        No la activamos hasta que la aceptes. Más detalle en{' '}
        <Link to="/privacidad" target="_blank" rel="noopener noreferrer">Términos y Privacidad</Link>.
      </p>
      <div className="cookie-banner-actions">
        <button
          className="cta-outline"
          onClick={() => { denyConsent(); setVisible(false); }}
        >
          Rechazar
        </button>
        <button
          className="premium-button"
          onClick={() => { grantConsent(); setVisible(false); }}
        >
          Aceptar
        </button>
      </div>

      <style>{`
        .cookie-banner {
          position: fixed; left: 1.25rem; right: 1.25rem; bottom: 1.25rem; z-index: 200;
          max-width: 560px; margin: 0 auto;
          background: var(--bg-secondary); border: 1px solid var(--border-strong);
          padding: 1.25rem 1.5rem; display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between;
        }
        .cookie-banner p { flex: 1 1 280px; font-size: 0.8rem; line-height: 1.6; color: var(--text-tertiary); margin: 0; }
        .cookie-banner p a { color: var(--text-secondary); text-decoration: underline; }
        .cookie-banner p a:hover { color: var(--gold); }
        .cookie-banner-actions { display: flex; gap: 0.6rem; flex-shrink: 0; }
        .cookie-banner-actions button { padding: 0.65rem 1.1rem; font-size: 0.65rem; }
        @media (max-width: 480px) {
          .cookie-banner { flex-direction: column; align-items: stretch; }
          .cookie-banner-actions { justify-content: stretch; }
          .cookie-banner-actions button { flex: 1; }
        }
      `}</style>
    </div>
  );
};

export default CookieBanner;
