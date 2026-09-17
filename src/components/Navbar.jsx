import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoUnderlaw from '../assets/logo-underlaw.jpg';
import { API_URL } from '../utils/adminApi';

// El botón dorado de la nav solo aparece cuando hay un lanzamiento real activo
// (programado -> ancla al bloque de inscripción con el nombre del drop, lanzado
// -> ir directo a comprarlo). Sin drop activo, no se muestra: sería redundante
// con el enlace "Colección" de al lado.
const useDropCta = () => {
  const [drop, setDrop] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/lanzamientos/home`)
      .then((r) => r.json())
      .then(({ lanzamiento }) => setDrop(lanzamiento || null))
      .catch(() => {});
  }, []);

  if (drop && drop.estado === 'programado') {
    return { label: drop.nombre_lanzamiento || 'Próximo drop', to: '/#lanzamiento' };
  }
  if (drop && drop.estado === 'lanzado') {
    return { label: 'Comprar', to: drop.producto_id ? `/products?producto=${drop.producto_id}` : '/products' };
  }
  return null;
};

const Navbar = () => {
  const cta = useDropCta();
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <nav className="nav-bar">
      <Link to="/" aria-label="Under Law" className="nav-logo">
        <img src={logoUnderlaw} alt="Under Law" className={isHome ? 'nav-logo-img' : 'nav-logo-img nav-logo-img-small'} />
        {!isHome && <span className="nav-wordmark">UnderLaw</span>}
      </Link>

      <div className="nav-links">
        {isHome ? (
          <>
            <Link to="/products" className="nav-pill">Colección</Link>
            <Link to="/#historia" className="nav-pill">Historia</Link>
            {cta && <Link to={cta.to} className="nav-pill">{cta.label}</Link>}
          </>
        ) : (
          <Link to="/" className="nav-link">Inicio</Link>
        )}
      </div>

      <style>{`
        .nav-bar {
          position: sticky;
          top: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.9rem clamp(1.1rem, 4vw, 2.5rem);
          background: rgba(6,6,6,0.82);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }
        .nav-logo { display: flex; align-items: center; gap: 0.65rem; flex-shrink: 0; min-width: 0; }
        .nav-logo-img {
          width: 38px; height: 38px; border-radius: 50%; object-fit: cover; display: block; flex-shrink: 0;
        }
        .nav-logo-img-small { width: 32px; height: 32px; }
        .nav-wordmark { font-family: var(--font-serif); font-size: 1.35rem; letter-spacing: -0.01em; white-space: nowrap; }
        .nav-links {
          display: flex;
          align-items: center;
          gap: clamp(0.7rem, 2.6vw, 1.9rem);
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }
        .nav-link { color: var(--text-primary); }
        .nav-pill {
          background: var(--text-primary);
          color: var(--bg-primary);
          padding: 0.6rem 1rem;
          font-weight: 500;
        }
        .nav-pill:hover { color: var(--bg-primary); opacity: 0.85; }
      `}</style>
    </nav>
  );
};

export default Navbar;
