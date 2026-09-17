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
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© 2026 Under Law. Todos los derechos reservados.</span>
        <span className="footer-legal"><a href="#">Términos</a><a href="#">Privacidad</a></span>
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
        .footer-social { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; }
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
