import React from 'react';
import { Link } from 'react-router-dom';
import logoUnderlaw from '../assets/logo-underlaw.jpg';

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container footer-cols">
        <div>
          <img src={logoUnderlaw} alt="Under Law" className="footer-logo" />
          <p className="footer-desc">Streetwear de lujo en series cortas. Cartagena, Colombia.</p>
        </div>

        <div>
          <h4 className="footer-heading">Tienda</h4>
          <div className="footer-links">
            <Link to="/products">Colección</Link>
            <Link to="/#lanzamiento">Próximo drop</Link>
          </div>
        </div>

        <div>
          <h4 className="footer-heading footer-heading-gold">Redes</h4>
          <a href="https://www.instagram.com/underla.w" target="_blank" rel="noopener noreferrer" className="footer-social">
            <InstagramIcon /> @underla.w
          </a>
          {/* En el celular, el enlace de perfil abre la app de TikTok si está instalada. */}
          <a href="https://www.tiktok.com/@underla_w" target="_blank" rel="noopener noreferrer" className="footer-social">
            <TikTokIcon /> TikTok
          </a>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© 2026 Under Law. Todos los derechos reservados.</span>
        <span className="footer-legal"><Link to="/privacidad">Términos y Privacidad</Link></span>
      </div>

      <style>{`
        .site-footer {
          padding: clamp(3rem, 7vw, 5rem) 0 2rem;
        }
        .footer-cols {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
          gap: clamp(2rem, 5vw, 3.5rem);
          margin-bottom: 2.5rem;
        }
        .footer-logo {
          width: 52px; height: 52px; border-radius: 50%; object-fit: cover; margin-bottom: 1rem; display: block;
        }
        .footer-desc {
          color: var(--text-muted);
          font-size: 0.85rem;
          line-height: 1.8;
          max-width: 28ch;
        }
        .footer-heading {
          font-family: var(--font-sans);
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--text-muted);
          font-weight: 500;
          margin-bottom: 1rem;
        }
        .footer-heading-gold { color: var(--gold); }
        .footer-links { display: grid; gap: 0.6rem; font-size: 0.88rem; }
        .footer-social { display: flex; width: fit-content; align-items: center; gap: 0.5rem; font-size: 0.88rem; }
        .footer-social + .footer-social { margin-top: 0.75rem; }
        .footer-bottom {
          border-top: 1px solid var(--border-soft);
          padding-top: 1.75rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: var(--text-dim);
        }
        .footer-legal { display: flex; gap: 1.5rem; }
      `}</style>
    </footer>
  );
};

export default Footer;
