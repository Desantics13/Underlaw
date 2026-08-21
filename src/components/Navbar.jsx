import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cierra el menú móvil al cambiar de ruta
  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <>
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50,
          transition: 'all 0.5s ease',
          padding: isScrolled ? '0.75rem 0' : '1.5rem 0',
          background: isScrolled ? 'rgba(10,10,10,0.85)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(12px)' : 'none',
          borderBottom: isScrolled ? '1px solid var(--border)' : 'none',
        }}
      >
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          {/* ── Left: spacer (mantiene el logo centrado) ── */}
          <div style={{ flex: 1, display: 'flex', gap: '1.5rem' }} className="nav-desktop-links" />

          {/* ── Center: Logo ── */}
          <Link to="/" onClick={closeMobile} style={{ flex: 1, textAlign: 'center', fontSize: isScrolled ? '1.4rem' : '2rem', transition: 'all 0.4s ease', fontFamily: 'var(--font-serif)', fontStyle: 'normal', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            Under Law
          </Link>

          {/* ── Right: desktop icons ── */}
          <div className="nav-desktop-links" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1.5rem' }}>
            <Link to="/admin" style={linkStyle}>Admin</Link>
            <button style={{ color: 'white' }}><Search size={20} strokeWidth={1.5} /></button>
            <Link to="/products" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShoppingCart size={20} strokeWidth={1.5} />
            </Link>
          </div>

          {/* ── Right: mobile hamburger ── */}
          <button
            className="nav-mobile-btn"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            style={{ display: 'none', color: 'white', zIndex: 60 }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ── */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 55,
            background: 'rgba(5,5,5,0.98)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '3rem',
          }}
        >
          {[
            { to: '/', label: 'Inicio' },
            { to: '/products', label: 'Colección' },
            { to: '/admin', label: 'Admin' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={closeMobile}
              style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '3rem', color: 'white', letterSpacing: '-0.02em' }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop-links { display: none !important; }
          .nav-mobile-btn   { display: flex !important; }
        }
      `}</style>
    </>
  );
};

const linkStyle = {
  fontSize: '0.75rem',
  fontWeight: '500',
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: 'white',
};

export default Navbar;
