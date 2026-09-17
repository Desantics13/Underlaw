import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Rocket, Search, Check } from 'lucide-react';
import { ADMIN_STYLES } from './adminStyles';
import { adminFetch, API_URL } from '../utils/adminApi';

// Mismo criterio de color que TallasEditor: 0 = agotado (rojo), 1-2 = pocas
// (dorado), sin contar = gris, el resto normal.
const colorCantidad = (cantidad) => {
  if (cantidad === null || cantidad === undefined) return 'var(--text-muted)';
  if (cantidad === 0) return 'var(--error)';
  if (cantidad <= 2) return 'var(--gold)';
  return 'var(--text-secondary)';
};

const etiquetaCantidad = (cantidad) => {
  if (cantidad === null || cantidad === undefined) return null;
  if (cantidad === 0) return { texto: 'Agotado', color: 'var(--error)' };
  if (cantidad <= 2) return { texto: 'Pocas', color: 'var(--gold)' };
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
    <div className="inv-fila" style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem', borderBottom: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="inv-fila-info" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: '1 1 260px', minWidth: '220px' }}>
        <div style={{ width: '48px', height: '60px', flexShrink: 0, background: 'var(--bg-tertiary)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {imagen ? <img src={imagen} alt={item.nombre_producto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} color="var(--text-dim)" />}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', margin: '0 0 0.15rem' }}>
            {item.nombre_lanzamiento}
            {tipo === 'producto' && item.estado === 'suspendido' && (
              <span style={{ color: 'var(--gold)', marginLeft: '0.5rem' }}>· Suspendido</span>
            )}
          </p>
          <p style={{ fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{item.nombre_producto}</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', margin: 0 }}>
            Total: {totalItem}{algunaSinContar ? ' +' : ''}
          </p>
        </div>
      </div>

      <div className="inv-fila-tallas" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', flex: '2 1 320px' }}>
        {tallas.map((t) => {
          const etiqueta = etiquetaCantidad(t.cantidad);
          return (
            <div key={t.talla} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t.talla}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={t.cantidad === null || t.cantidad === undefined ? '' : t.cantidad}
                onChange={(e) => cambiarCantidad(t.talla, e.target.value)}
                placeholder="—"
                style={{
                  width: '58px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)',
                  color: colorCantidad(t.cantidad), padding: '0.45rem 0.3rem', fontSize: '0.88rem', outline: 'none'
                }}
              />
              {etiqueta && <span style={{ fontSize: '0.62rem', color: etiqueta.color }}>{etiqueta.texto}</span>}
            </div>
          );
        })}
      </div>

      <div style={{ flexShrink: 0, minWidth: '104px', display: 'flex', justifyContent: 'flex-end' }}>
        {dirty ? (
          <button
            onClick={guardar}
            disabled={saving}
            style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', padding: '0.55rem 1.1rem', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', fontFamily: 'var(--font-sans)', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        ) : guardadoOk ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.76rem' }}>
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
      <div className="admin-content-head">
        <div>
          <h1 className="admin-content-title">Inventario</h1>
          <p className="admin-content-sub">Carga las cantidades por talla de cada producto y de los próximos lanzamientos.</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: `repeat(${Math.min(tallasResumen.length + 1, 6)}, 1fr)` }}>
        <div className="admin-stat-cell">
          <p className="admin-stat-label">Total camisas</p>
          <p className="admin-stat-value tabular" style={{ fontSize: '2.2rem', color: 'var(--gold)' }}>{resumen.total}</p>
        </div>
        {tallasResumen.map((t) => (
          <div key={t} className="admin-stat-cell">
            <p className="admin-stat-label">Talla {t}</p>
            <p className="admin-stat-value tabular" style={{ fontSize: '2.2rem' }}>{resumen.porTalla[t]}</p>
          </div>
        ))}
      </div>

      {/* Buscador y filtro */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto por nombre…"
            style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: '0.7rem 1rem 0.7rem 2.25rem', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)' }}
          />
        </div>
        <select
          value={seccionFiltro}
          onChange={(e) => setSeccionFiltro(e.target.value)}
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: '0.7rem 1rem', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)' }}
        >
          <option value="">Todas las secciones</option>
          {secciones.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>

      {/* Productos del catálogo */}
      {loading ? (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '3rem 0' }}>Cargando inventario...</p>
      ) : (
        <div className="admin-card" style={{ marginBottom: '2.5rem' }}>
          {productosFiltrados.length === 0 ? (
            <div className="admin-empty" style={{ padding: '3rem 0' }}>
              <Package size={28} />
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
      <h2 className="admin-card-title" style={{ marginBottom: '0.6rem' }}>Próximos lanzamientos</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem', maxWidth: '62ch' }}>
        Carga acá las cantidades de un lanzamiento antes de que se publique: al llegar la fecha, se copian automáticamente al producto.
      </p>
      {!loading && (
        <div className="admin-card">
          {lanzamientos.length === 0 ? (
            <div className="admin-empty" style={{ padding: '3rem 0' }}>
              <Rocket size={28} />
              <p>No hay lanzamientos programados.</p>
            </div>
          ) : (
            lanzamientos.map((l) => (
              <FilaInventario key={l.id} item={l} tipo="lanzamiento" onGuardado={actualizarTallasLocal(lanzamientos, setLanzamientos)} />
            ))
          )}
        </div>
      )}

      <style>{ADMIN_STYLES}</style>
      <style>{`
        @media (max-width: 768px) {
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
