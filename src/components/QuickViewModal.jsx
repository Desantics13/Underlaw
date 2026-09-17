import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import ProductImageCarousel from './ProductImageCarousel';

const TALLAS_DEFAULT = [
  { talla: 'S', disponible: true, max_compra: 10 },
  { talla: 'M', disponible: true, max_compra: 10 },
  { talla: 'L', disponible: true, max_compra: 10 },
  { talla: 'XL', disponible: true, max_compra: 10 }
];

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
  const tallas = product.tallas && product.tallas.length > 0 ? product.tallas : TALLAS_DEFAULT;
  const agotado = tallas.every((t) => !t.disponible);
  const tallaSeleccionada = tallas.find((t) => t.talla === talla);
  const maxCompra = tallaSeleccionada ? tallaSeleccionada.max_compra : 10;

  const elegirTalla = (t, disponible) => {
    if (!disponible) return;
    setTalla(t.talla);
    setQuantity((q) => Math.min(q, t.max_compra));
  };

  const handleAdd = () => {
    if (!talla || agotado) return;
    onAddToCart(product, Math.min(quantity, maxCompra), talla);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,6,0.82)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
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
        style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', position: 'relative' }}
        className="quickview-modal"
      >
        <button
          onClick={onClose}
          aria-label="Cerrar vista rápida"
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', zIndex: 3 }}
        >
          <X size={22} />
        </button>

        <div className="quickview-grid">
          <div className="quickview-image" style={{ position: 'relative', aspectRatio: '3/4', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
            <ProductImageCarousel images={images} alt={product.name} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', padding: '2.5rem' }}>
            <span className="eyebrow">{product.lanzamiento || 'Ficha de producto'}</span>
            <h2 className="font-serif italic" style={{ fontSize: '1.8rem', margin: '0.5rem 0' }}>{product.name}</h2>
            {product.detalle && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{product.detalle}</p>
            )}
            <p className="tabular" style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>${product.price.toLocaleString('es-CO')} COP</p>

            <div style={{ marginBottom: '2rem' }}>
              <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Talla</p>
              {agotado ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--error)' }}>Agotado</p>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {tallas.map((item) => (
                    <button
                      key={item.talla}
                      type="button"
                      onClick={() => elegirTalla(item, item.disponible)}
                      disabled={!item.disponible}
                      aria-pressed={talla === item.talla}
                      style={{
                        minWidth: '2.9rem',
                        padding: '0.65rem',
                        border: `1px solid ${talla === item.talla ? 'var(--text-primary)' : 'var(--border-strong)'}`,
                        background: talla === item.talla ? 'var(--text-primary)' : 'transparent',
                        color: !item.disponible ? 'var(--text-muted)' : (talla === item.talla ? 'var(--bg-primary)' : 'var(--text-primary)'),
                        cursor: item.disponible ? 'pointer' : 'not-allowed',
                        textDecoration: item.disponible ? 'none' : 'line-through',
                        opacity: item.disponible ? 1 : 0.5,
                        fontSize: '0.85rem'
                      }}
                    >
                      {item.talla}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Cantidad</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Disminuir cantidad"
                  style={{ padding: '0.5rem', border: '1px solid var(--border)', color: 'var(--text-primary)', background: 'transparent', cursor: 'pointer' }}
                >
                  <Minus size={14} />
                </button>
                <span style={{ minWidth: '1.5rem', textAlign: 'center', color: 'var(--text-primary)' }}>{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxCompra, q + 1))}
                  disabled={quantity >= maxCompra}
                  aria-label="Aumentar cantidad"
                  style={{ padding: '0.5rem', border: '1px solid var(--border)', color: 'var(--text-primary)', background: 'transparent', cursor: quantity >= maxCompra ? 'not-allowed' : 'pointer', opacity: quantity >= maxCompra ? 0.4 : 1 }}
                >
                  <Plus size={14} />
                </button>
              </div>
              {talla && quantity >= maxCompra && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Máximo {maxCompra} unidades por compra en esta talla.
                </p>
              )}
            </div>

            {product.descripcion && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2rem', whiteSpace: 'pre-line' }}>
                {product.descripcion}
              </p>
            )}

            {!agotado && !talla && (
              <p style={{ fontSize: '0.75rem', color: 'var(--gold)', marginBottom: '1rem' }}>Selecciona una talla para continuar.</p>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={!talla || agotado}
              className="premium-button"
              style={{ width: '100%', padding: '1.1rem', marginTop: 'auto', opacity: (talla && !agotado) ? 1 : 0.5, cursor: (talla && !agotado) ? 'pointer' : 'not-allowed' }}
            >
              {agotado ? 'Agotado' : 'Añadir al Carrito'}
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
