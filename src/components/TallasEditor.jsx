import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

// Color según el stock: 0 = agotado (rojo), 1-2 = pocas unidades (dorado),
// vacío/null = "sin contar" (gris), el resto normal (hueso). Mismo criterio
// que el panel de Inventario.
const colorCantidad = (cantidad) => {
  if (cantidad === null || cantidad === undefined) return 'var(--text-muted)';
  if (cantidad === 0) return 'var(--error)';
  if (cantidad <= 2) return 'var(--gold)';
  return 'var(--text-primary)';
};

// Editor de tallas reutilizado en Productos y Lanzamientos: cada talla tiene
// su cantidad en stock (vacío = "sin contar", se vende sin límite) y se
// pueden agregar (ej. XXL) o quitar.
// tallas: [{ talla, cantidad }, ...]
const TallasEditor = ({ tallas, onChange }) => {
  const [nuevaTalla, setNuevaTalla] = useState('');

  const cambiarCantidad = (talla, valor) => {
    const cantidad = valor === '' ? null : Math.max(0, Math.trunc(Number(valor)));
    onChange(tallas.map((t) => (t.talla === talla ? { ...t, cantidad } : t)));
  };

  const quitarTalla = (talla) => {
    onChange(tallas.filter((t) => t.talla !== talla));
  };

  const agregarTalla = () => {
    const valor = nuevaTalla.trim().toUpperCase();
    if (!valor) return;
    if (tallas.some((t) => t.talla.toUpperCase() === valor)) {
      setNuevaTalla('');
      return;
    }
    onChange([...tallas, { talla: valor, cantidad: null }]);
    setNuevaTalla('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
        {tallas.map((t) => (
          <div
            key={t.talla}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--bg-primary)', border: '1px solid var(--border-strong)',
              padding: '0.4rem 0.4rem 0.4rem 0.75rem'
            }}
          >
            <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', minWidth: '1.5rem' }}>{t.talla}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={t.cantidad === null || t.cantidad === undefined ? '' : t.cantidad}
              onChange={(e) => cambiarCantidad(t.talla, e.target.value)}
              placeholder="Sin límite"
              style={{
                width: '80px', background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)',
                color: colorCantidad(t.cantidad), padding: '0.35rem 0.5rem', fontSize: '0.85rem', outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={() => quitarTalla(t.talla)}
              aria-label={`Quitar talla ${t.talla}`}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        Deja el campo vacío para venderla sin límite ("sin contar"). Escribe 0 para marcarla agotada.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={nuevaTalla}
          onChange={(e) => setNuevaTalla(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarTalla(); } }}
          placeholder="Ej: XXL"
          maxLength={10}
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', fontSize: '0.85rem', width: '100px', outline: 'none' }}
        />
        <button
          type="button"
          onClick={agregarTalla}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '0.5rem 0.85rem', border: '1px dashed var(--border-strong)', cursor: 'pointer', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-sans)' }}
        >
          <Plus size={14} /> Agregar talla
        </button>
      </div>
    </div>
  );
};

export default TallasEditor;
