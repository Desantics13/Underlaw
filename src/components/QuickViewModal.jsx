import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import ProductImageCarousel from './ProductImageCarousel';

const TALLAS_DISPONIBLES = ['S', 'M', 'L', 'XL'];

// Modal de vista rápida de producto (dos columnas, inspirado en Adidas):
// imagen con carrusel a la izquierda, y a la derecha título, precio, talla,
// cantidad y el botón real de "Añadir al Carrito".
const QuickViewModal = ({ product, onClose, onAddToCart }) => {
  const [talla, setTalla] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const images = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);

  const handleAdd = () => {
    if (!talla) return;
    onAddToCart(product, quantity, talla);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Vista rápida de ${product.name}`}
        style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)', position: 'relative' }}
        className="quickview-modal"
      >
        <button
          onClick={onClose}
          aria-label="Cerrar vista rápida"
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', zIndex: 3 }}
        >
          <X size={24} />
        </button>

        <div className="quickview-grid">
          <div className="quickview-image" style={{ position: 'relative', aspectRatio: '3/4', backgroundColor: '#0c0c0c', overflow: 'hidden' }}>
            <ProductImageCarousel images={images} alt={product.name} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', padding: '2.5rem' }}>
            <h2 className="font-serif italic" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{product.name}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>${product.price.toLocaleString('es-CO')} COP</p>

            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Talla</p>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {TALLAS_DISPONIBLES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTalla(t)}
                    aria-pressed={talla === t}
                    style={{
                      minWidth: '2.75rem',
                      padding: '0.6rem',
                      border: `1px solid ${talla === t ? 'white' : 'var(--border)'}`,
                      background: talla === t ? 'white' : 'transparent',
                      color: talla === t ? 'black' : 'white',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Cantidad</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Disminuir cantidad"
                  style={{ padding: '0.5rem', border: '1px solid var(--border)', color: 'white', background: 'transparent', cursor: 'pointer' }}
                >
                  <Minus size={14} />
                </button>
                <span style={{ minWidth: '1.5rem', textAlign: 'center', color: 'white' }}>{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Aumentar cantidad"
                  style={{ padding: '0.5rem', border: '1px solid var(--border)', color: 'white', background: 'transparent', cursor: 'pointer' }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {!talla && (
              <p style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '1rem' }}>Selecciona una talla para continuar.</p>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={!talla}
              className="premium-button"
              style={{ width: '100%', padding: '1.1rem', marginTop: 'auto', opacity: talla ? 1 : 0.5, cursor: talla ? 'pointer' : 'not-allowed' }}
            >
              Añadir al Carrito
            </button>
          </div>
        </div>
      </motion.div>

      <style>{`
        .quickview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 768px) {
          .quickview-grid {
            grid-template-columns: 1fr;
          }
          .quickview-image {
            aspect-ratio: 4/3 !important;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default QuickViewModal;
