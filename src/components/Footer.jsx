import React from 'react';
import { Instagram, Facebook, Twitter, Globe } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ backgroundColor: '#000', borderTop: '1px solid var(--border)', padding: '6rem 0 3rem 0', marginTop: '5rem' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '4rem', marginBottom: '5rem' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.8', maxWidth: '300px' }}>
              Estableciendo un nuevo estándar en el streetwear de lujo. Under Law es más que ropa, es una declaración de independencia.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '2rem' }}>Síguenos</h4>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="https://www.instagram.com/underla.w?igsh=dWF0aHU4Zjk5azE1" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                <Instagram size={20} strokeWidth={1.5} />
              </a>
              <Facebook size={20} strokeWidth={1.5} />
              <Twitter size={20} strokeWidth={1.5} />
            </div>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <p>© 2026 UNDER LAW. Todos los derechos reservados.</p>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <span>Términos</span>
            <span>Privacidad</span>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          footer > .container > div:first-child { grid-template-columns: 1fr !important; gap: 3rem !important; text-align: center; }
          footer p { margin-left: auto; margin-right: auto; }
          footer .container > div:first-child > div { display: flex; flex-direction: column; align-items: center; }
          footer .container > div:last-child { flex-direction: column; gap: 1.5rem; text-align: center; }
        }
      `}} />
    </footer>
  );
};

export default Footer;
