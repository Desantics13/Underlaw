import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Carrusel de imágenes reutilizable: casilla de imagen de un producto + flechas
// izquierda/derecha funcionales. Se usa en el panel de Admin, en la tarjeta del
// catálogo público y en el modal de vista rápida.
const arrowStyle = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'rgba(0,0,0,0.55)',
  border: 'none',
  borderRadius: '50%',
  width: '2rem',
  height: '2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'white',
  zIndex: 2
};

const ProductImageCarousel = ({ images, alt, imgClassName, imgStyle, arrowSize = 18 }) => {
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const safeIndex = ((index % images.length) + images.length) % images.length;

  const goPrev = (e) => {
    e.stopPropagation();
    setIndex((prev) => prev - 1);
  };

  const goNext = (e) => {
    e.stopPropagation();
    setIndex((prev) => prev + 1);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img
        src={images[safeIndex]}
        alt={alt}
        className={imgClassName}
        style={{ width: '100%', height: '100%', objectFit: 'cover', ...imgStyle }}
      />
      {images.length > 1 && (
        <>
          <button type="button" onClick={goPrev} aria-label="Imagen anterior" style={{ ...arrowStyle, left: '0.5rem' }}>
            <ChevronLeft size={arrowSize} />
          </button>
          <button type="button" onClick={goNext} aria-label="Imagen siguiente" style={{ ...arrowStyle, right: '0.5rem' }}>
            <ChevronRight size={arrowSize} />
          </button>
        </>
      )}
    </div>
  );
};

export default ProductImageCarousel;
