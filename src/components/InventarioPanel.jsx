import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Rocket, Search, Check } from 'lucide-react';
import { adminFetch, API_URL } from '../utils/adminApi';

// Mismo criterio de color que TallasEditor: 0 = agotado (rojo), 1-2 = pocas
// (ámbar), sin contar = gris, el resto normal.
const colorCantidad = (cantidad) => {
  if (cantidad === null || cantidad === undefined) return '#64748b';
  if (cantidad === 0) return '#f43f5e';
  if (cantidad <= 2) return '#f59e0b';
  return '#e2e8f0';
};

const etiquetaCantidad = (cantidad) => {
  if (cantidad === null || cantidad === undefined) return null;
  if (cantidad === 0) return { texto: 'Agotado', color: '#f43f5e' };
  if (cantidad <= 2) return { texto: 'Pocas', color: '#f59e0b' };
  return null;
};

// Una fila de inventario: imagen + nombre a la izquierda, casillas de talla a
// la derecha (una por talla configurada). Se usa tanto para productos del
// catálogo como para próximos lanzamientos.
const FilaInventario = ({ item, tipo, onGuardado }) => {
  const [tallas, setTallas] = useState(item.tallas || []);
  const [saving, setSaving] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);

  // Se reinicia solo cuando cambia DE producto (no en cada guardado propio:
  // guardar actualiza el "item" del padre y no queremos que eso tape el
  // aviso de "Guardado" que el usuario recién va a ver).
  useEffect(() => {
    setTallas(item.tallas || []);
    setGuardadoOk(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const dirty = JSON.stringify(tallas) !== JSON.stringify(item.tallas || []);

  const cambiarCantidad = (talla, valor) => {
    const cantidad = valor === '' ? null : Math.max(0, Math.trunc(Number(valor)));
    setTallas((prev) => prev.map((t) => (t.talla === talla ? { ...t, cantidad } : t)));
    setGuardadoOk(false);
  };

  const guardar = async () => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/inventario/${item.id}?tipo=${tipo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tallas })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setGuardadoOk(true);
      onGuardado(item.id, data.tallas);
    } catch (error) {
      console.error('Error al guardar el inventario:', error);
    } finally {
      setSaving(false);
    }
  };

  const totalItem = tallas.reduce((sum, t) => (t.cantidad === null ? sum : sum + t.cantidad), 0);
  const algunaSinContar = tallas.some((t) => t.cantidad === null);
  const imagen = item.imagen || (item.imagenes && item.imagenes[0]?.url) || (item.imagenes && item.imagenes[0]);

  return (
    <div className="inv-fila" style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem', borderBottom: '1px solid #1e293b', alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="inv-fila-info" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: '1 1 260px', minWidth: '220px' }}>
        <div style={{ width: '48px', height: '60px', flexShrink: 0, background: '#1e293b', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {imagen ? <img src={imagen} alt={item.nombre_producto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} color="#475569" />}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '0.15rem' }}>
            {item.nombre_lanzamiento}
            {tipo === 'producto' && item.estado === 'suspendido' && (
              <span style={{ color: '#f59e0b', marginLeft: '0.5rem' }}>· Suspendido</span>
            )}
          </p>
          <p style={{ color: '#fff', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre_producto}</p>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            Total: {totalItem}{algunaSinContar ? ' +' : ''}
          </p>
        </div>
      </div>

      <div className="inv-fila-tallas" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', flex: '2 1 320px' }}>
        {tallas.map((t) => {
          const etiqueta = etiquetaCantidad(t.cantidad);
          return (
            <div key={t.talla} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>{t.talla}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={t.cantidad === null || t.cantidad === undefined ? '' : t.cantidad}
                onChange={(e) => cambiarCantidad(t.talla, e.target.value)}
                placeholder="—"
                style={{
                  width: '56px', textAlign: 'center', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px',
                  color: colorCantidad(t.cantidad), padding: '0.4rem 0.3rem', fontSize: '0.85rem'
                }}
              />
              {etiqueta && <span style={{ fontSize: '0.65rem', color: etiqueta.color }}>{etiqueta.texto}</span>}
            </div>
          );
        })}
      </div>

      <div style={{ flexShrink: 0, minWidth: '110px', display: 'flex', justifyContent: 'flex-end' }}>
        {dirty ? (
          <button
            onClick={guardar}
            disabled={saving}
            style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '0.55rem 1rem', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 500, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        ) : guardadoOk ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontSize: '0.8rem' }}>
            <Check size={14} /> Guardado
          </span>
        ) : null}
      </div>
    </div>
  );
};

const InventarioPanel = () => {
  const [productos, setProductos] = useState([]);
  const [lanzamientos, setLanzamientos] = useState([]);
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [seccionFiltro, setSeccionFiltro] = useState('');

  const cargar = () => {
    setLoading(true);
    adminFetch('/api/inventario')
      .then((res) => res.json())
      .then((data) => {
        setProductos(Array.isArray(data.productos) ? data.productos : []);
        setLanzamientos(Array.isArray(data.lanzamientos) ? data.lanzamientos : []);
      })
      .catch((err) => console.error('Error al obtener el inventario:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    fetch(`${API_URL}/api/secciones`)
      .then((res) => res.json())
      .then((data) => setSecciones(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error al obtener las secciones:', err));
  }, []);

  const actualizarTallasLocal = (lista, setLista) => (id, nuevasTallas) => {
    setLista(lista.map((p) => (p.id === id ? { ...p, tallas: nuevasTallas } : p)));
  };

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideBusqueda = !busqueda.trim() || p.nombre_producto.toLowerCase().includes(busqueda.trim().toLowerCase());
      const coincideSeccion = !seccionFiltro || String(p.seccion_id) === seccionFiltro;
      return coincideBusqueda && coincideSeccion;
    });
  }, [productos, busqueda, seccionFiltro]);

  // Resumen: total de camisas y total por talla, solo con cantidad controlada
  // (las "sin contar" no suman a un total numérico).
  const resumen = useMemo(() => {
    const porTalla = {};
    let total = 0;
    productos.forEach((p) => {
      (p.tallas || []).forEach((t) => {
        if (t.cantidad === null || t.cantidad === undefined) return;
        porTalla[t.talla] = (porTalla[t.talla] || 0) + t.cantidad;
        total += t.cantidad;
      });
    });
    return { total, porTalla };
  }, [productos]);

  const tallasResumen = Object.keys(resumen.porTalla).sort();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h3 style={{ fontSize: '1.25rem', color: '#fff', fontFamily: 'var(--font-serif)', fontStyle: 'italic', marginBottom: '1.5rem' }}>Inventario</h3>

      {/* Resumen */}
      <div className="inv-resumen-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(tallasResumen.length + 1, 6)}, 1fr)`, gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Total camisas</p>
          <h2 style={{ fontSize: '2rem', color: '#fff', margin: 0 }}>{resumen.total}</h2>
        </div>
        {tallasResumen.map((t) => (
          <div key={t} style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Talla {t}</p>
            <h2 style={{ fontSize: '2rem', color: '#fff', margin: 0 }}>{resumen.porTalla[t]}</h2>
          </div>
        ))}
      </div>

      {/* Buscador y filtro */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto por nombre..."
            style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', padding: '0.65rem 1rem 0.65rem 2.25rem', fontSize: '0.85rem' }}
          />
        </div>
        <select
          value={seccionFiltro}
          onChange={(e) => setSeccionFiltro(e.target.value)}
          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', padding: '0.65rem 1rem', fontSize: '0.85rem' }}
        >
          <option value="">Todas las secciones</option>
          {secciones.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>

      {/* Productos del catálogo */}
      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem 0' }}>Cargando inventario...</p>
      ) : (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', marginBottom: '2.5rem' }}>
          {productosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
              <Package size={28} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <p>No hay productos que coincidan.</p>
            </div>
          ) : (
            productosFiltrados.map((p) => (
              <FilaInventario key={p.id} item={p} tipo="producto" onGuardado={actualizarTallasLocal(productos, setProductos)} />
            ))
          )}
        </div>
      )}

      {/* Próximos lanzamientos */}
      <h3 style={{ fontSize: '1.1rem', color: '#fff', fontFamily: 'var(--font-serif)', fontStyle: 'italic', marginBottom: '1rem' }}>Próximos Lanzamientos</h3>
      <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1.5rem', maxWidth: '600px' }}>
        Carga acá las cantidades de un lanzamiento antes de que se publique: al llegar la fecha, se copian automáticamente al producto.
      </p>
      {!loading && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
          {lanzamientos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
              <Rocket size={28} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <p>No hay lanzamientos programados.</p>
            </div>
          ) : (
            lanzamientos.map((l) => (
              <FilaInventario key={l.id} item={l} tipo="lanzamiento" onGuardado={actualizarTallasLocal(lanzamientos, setLanzamientos)} />
            ))
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .inv-resumen-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .inv-fila {
            flex-direction: column;
            align-items: stretch !important;
          }
          .inv-fila-info {
            flex: none !important;
          }
          .inv-fila-tallas {
            flex: none !important;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default InventarioPanel;
