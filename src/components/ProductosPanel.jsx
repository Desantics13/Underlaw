import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, PauseCircle, PlayCircle, Trash2, X, ImagePlus, Package } from 'lucide-react';
import ProductImageCarousel from './ProductImageCarousel';
import TallasEditor from './TallasEditor';
import { ADMIN_STYLES } from './adminStyles';
import { adminFetch, API_URL } from '../utils/adminApi';

const ESTADO_STYLES = {
  activo: { color: 'var(--success)', label: 'Activo' },
  suspendido: { color: 'var(--gold)', label: 'Suspendido' }
};

const DETALLE_MAX = 120;
const TALLAS_DEFAULT = [
  { talla: 'S', cantidad: null },
  { talla: 'M', cantidad: null },
  { talla: 'L', cantidad: null },
  { talla: 'XL', cantidad: null }
];

// Sugiere el siguiente nombre de lanzamiento (Lanzamiento 1, 2, 3...) a partir de los existentes
const sugerirNombreLanzamiento = (productos) => {
  const numeros = productos
    .map(p => {
      const match = /^lanzamiento\s+(\d+)$/i.exec((p.nombre_lanzamiento || '').trim());
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(n => n !== null);
  const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : productos.length + 1;
  return `Lanzamiento ${siguiente}`;
};

const ProductosPanel = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProducto, setEditingProducto] = useState(null);
  const [nombreLanzamiento, setNombreLanzamiento] = useState('');
  const [nombreProducto, setNombreProducto] = useState('');
  const [precio, setPrecio] = useState('');
  const [detalle, setDetalle] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tallas, setTallas] = useState(TALLAS_DEFAULT);
  const [seccionId, setSeccionId] = useState('');
  const [secciones, setSecciones] = useState([]);
  // Galería en edición dentro del formulario: lista ordenada de { key, kind: 'existing'|'new', url, file? }.
  // "existing" son imágenes que el producto ya tenía (se conservan salvo que se quiten con la X);
  // "new" son archivos recién seleccionados (se suben al guardar). Ambas se pueden quitar individualmente.
  const [imagenes, setImagenes] = useState([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const cargarProductos = () => {
    setLoading(true);
    adminFetch('/api/catalogo/admin')
      .then(res => res.json())
      .then(data => setProductos(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error al obtener el catálogo:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarProductos();
    fetch(`${API_URL}/api/secciones`)
      .then(res => res.json())
      .then(data => setSecciones(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error al obtener las secciones:', err));
  }, []);

  const abrirCrear = () => {
    setEditingProducto(null);
    setNombreLanzamiento(sugerirNombreLanzamiento(productos));
    setNombreProducto('');
    setPrecio('');
    setDetalle('');
    setDescripcion('');
    setTallas(TALLAS_DEFAULT);
    setSeccionId('');
    setImagenes([]);
    setFormError('');
    setShowForm(true);
  };

  const abrirEditar = (producto) => {
    setEditingProducto(producto);
    setNombreLanzamiento(producto.nombre_lanzamiento);
    setNombreProducto(producto.nombre_producto);
    setPrecio(String(producto.precio));
    setDetalle(producto.detalle || '');
    setDescripcion(producto.descripcion || '');
    setTallas(producto.tallas && producto.tallas.length > 0 ? producto.tallas : TALLAS_DEFAULT);
    setSeccionId(producto.seccion_id ? String(producto.seccion_id) : '');
    const existentes = producto.imagenes && producto.imagenes.length > 0 ? producto.imagenes : (producto.imagen ? [producto.imagen] : []);
    setImagenes(existentes.map((url) => ({ key: url, kind: 'existing', url })));
    setFormError('');
    setShowForm(true);
  };

  const cerrarForm = () => {
    if (saving) return;
    setShowForm(false);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const nuevas = files.map((file) => ({
      key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind: 'new',
      url: URL.createObjectURL(file),
      file
    }));
    setImagenes((prev) => [...prev, ...nuevas].slice(0, 8));
    e.target.value = '';
  };

  const quitarImagen = (key) => {
    setImagenes((prev) => {
      if (prev.length <= 1) return prev;
      const objetivo = prev.find((img) => img.key === key);
      if (objetivo && objetivo.kind === 'new') URL.revokeObjectURL(objetivo.url);
      return prev.filter((img) => img.key !== key);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!nombreLanzamiento.trim()) {
      setFormError('El nombre del lanzamiento es requerido.');
      return;
    }
    if (!nombreProducto.trim()) {
      setFormError('El nombre del producto es requerido.');
      return;
    }
    if (!precio || Number(precio) <= 0) {
      setFormError('El precio debe ser un número mayor a 0.');
      return;
    }
    if (imagenes.length === 0) {
      setFormError('Selecciona al menos una imagen para el producto.');
      return;
    }

    if (detalle.length > DETALLE_MAX) {
      setFormError(`El detalle no puede superar los ${DETALLE_MAX} caracteres.`);
      return;
    }

    const body = new FormData();
    body.append('nombre_lanzamiento', nombreLanzamiento.trim());
    body.append('nombre_producto', nombreProducto.trim());
    body.append('precio', precio);
    body.append('detalle', detalle.trim());
    body.append('descripcion', descripcion);
    body.append('tallas', JSON.stringify(tallas));
    body.append('seccion_id', seccionId);
    if (editingProducto) {
      const aConservar = imagenes.filter((img) => img.kind === 'existing').map((img) => img.url);
      body.append('imagenes_conservar', JSON.stringify(aConservar));
    }
    imagenes.filter((img) => img.kind === 'new').forEach((img) => body.append('imagenes', img.file));

    setSaving(true);
    try {
      const url = editingProducto ? `/api/catalogo/${editingProducto.id}` : '/api/catalogo';
      const method = editingProducto ? 'PUT' : 'POST';
      const res = await adminFetch(url, { method, body });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el producto');
      }

      if (editingProducto) {
        setProductos(prev => prev.map(p => (p.id === data.id ? data : p)));
      } else {
        setProductos(prev => [data, ...prev]);
      }

      setShowForm(false);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEstado = async (producto) => {
    const nuevoEstado = producto.estado === 'activo' ? 'suspendido' : 'activo';
    try {
      const res = await adminFetch(`/api/catalogo/${producto.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cambiar el estado');
      setProductos(prev => prev.map(p => (p.id === producto.id ? data : p)));
    } catch (error) {
      console.error('Error al cambiar el estado del producto:', error);
    }
  };

  const confirmarEliminar = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/catalogo/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo eliminar el producto');
      }
      setProductos(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="admin-content-head">
        <div>
          <h1 className="admin-content-title">Catálogo de productos</h1>
          <p className="admin-content-sub">Crea, edita, suspende o elimina cada pieza del catálogo.</p>
        </div>
        <button onClick={abrirCrear} className="admin-btn-create">
          <Plus size={15} /> Crear producto
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '3rem 0' }}>Cargando catálogo...</p>
      ) : productos.length === 0 ? (
        <div className="admin-empty">
          <Package size={32} />
          <p>Aún no has creado ningún lanzamiento.</p>
        </div>
      ) : (
        <div className="admin-grid">
          {productos.map(producto => {
            const estado = ESTADO_STYLES[producto.estado] || ESTADO_STYLES.activo;
            return (
              <div key={producto.id} className="admin-tile">
                <div className="admin-tile-media">
                  {producto.imagenes && producto.imagenes.length > 0 ? (
                    <ProductImageCarousel images={producto.imagenes} alt={producto.nombre_producto} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={32} color="var(--text-dim)" />
                    </div>
                  )}
                </div>
                <div className="admin-tile-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }}>{producto.nombre_lanzamiento}</p>
                      <p style={{ margin: '0.3rem 0 0', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.15rem' }}>{producto.nombre_producto}</p>
                    </div>
                    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: estado.color }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: estado.color }} />{estado.label}
                    </span>
                  </div>
                  <p className="tabular" style={{ margin: '0.5rem 0 0', fontSize: '0.95rem' }}>${Number(producto.precio).toLocaleString('es-CO')} COP</p>

                  <div className="admin-tile-actions">
                    <button onClick={() => abrirEditar(producto)} className="admin-link-gold-plain">
                      <Pencil size={14} /> Editar
                    </button>
                    <button onClick={() => toggleEstado(producto)} className="admin-link-text">
                      {producto.estado === 'activo' ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                      {producto.estado === 'activo' ? 'Suspender' : 'Activar'}
                    </button>
                    <button onClick={() => setDeleteTarget(producto)} className="admin-link-error" style={{ borderBottom: 'none' }}>
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear/Editar */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={cerrarForm}
            className="admin-modal-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="admin-modal"
              style={{ maxWidth: '460px' }}
            >
              <div className="admin-modal-head">
                <h2 className="admin-modal-title">{editingProducto ? 'Editar producto' : 'Crear producto'}</h2>
                <button onClick={cerrarForm} className="admin-modal-close" aria-label="Cerrar"><X size={22} /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
                <label className="admin-field">
                  <span>Nombre del lanzamiento</span>
                  <input type="text" value={nombreLanzamiento} onChange={(e) => setNombreLanzamiento(e.target.value)} />
                </label>

                <label className="admin-field">
                  <span>Nombre del producto</span>
                  <input type="text" placeholder="Ej: Oversized Buddha Tee" value={nombreProducto} onChange={(e) => setNombreProducto(e.target.value)} />
                </label>

                <label className="admin-field">
                  <span>Precio (COP)</span>
                  <input type="number" min="1" value={precio} onChange={(e) => setPrecio(e.target.value)} />
                </label>

                <label className="admin-field">
                  <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Detalle (frase corta)</span><span style={{ color: 'var(--text-dim)' }}>{detalle.length}/{DETALLE_MAX}</span>
                  </span>
                  <input type="text" placeholder="Ej: Algodón 240gsm, corte oversized" value={detalle} maxLength={DETALLE_MAX} onChange={(e) => setDetalle(e.target.value)} />
                </label>

                <label className="admin-field">
                  <span>Descripción</span>
                  <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} placeholder="Descripción completa del producto" />
                </label>

                <div className="admin-field">
                  <span>Tallas</span>
                  <TallasEditor tallas={tallas} onChange={setTallas} />
                </div>

                <label className="admin-field">
                  <span>Sección (opcional)</span>
                  <select value={seccionId} onChange={(e) => setSeccionId(e.target.value)}>
                    <option value="">Sin sección</option>
                    {secciones.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </label>

                <div className="admin-field">
                  <span>Imágenes (JPG o PNG, puedes elegir varias)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {imagenes.map((img) => (
                      <div key={img.key} style={{ position: 'relative' }}>
                        <img src={img.url} alt="Vista previa" style={{ width: '60px', height: '75px', objectFit: 'cover', border: '1px solid var(--border-strong)', display: 'block' }} />
                        {imagenes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => quitarImagen(img.key)}
                            aria-label="Quitar esta imagen"
                            style={{ position: 'absolute', top: '-7px', right: '-7px', width: '19px', height: '19px', borderRadius: '50%', background: 'var(--error)', border: '1px solid var(--bg-secondary)', color: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '0.65rem 1rem', border: '1px solid var(--border-strong)', cursor: 'pointer', fontSize: '0.76rem', fontFamily: 'var(--font-sans)' }}
                    >
                      <ImagePlus size={15} /> Agregar imágenes
                    </button>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: 0 }}>Puedes agregar varias y quitar las que no quieras con la X.</p>
                </div>

                {formError && <p className="admin-error">{formError}</p>}

                <button type="submit" disabled={saving} className="premium-button" style={{ marginTop: '0.5rem', opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Guardando…' : editingProducto ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Eliminación */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => !deleting && setDeleteTarget(null)}
            className="admin-modal-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="admin-confirm-modal"
            >
              <Trash2 size={28} color="var(--error)" style={{ marginBottom: '1rem' }} />
              <h3 className="admin-confirm-title">¿Eliminar este producto?</h3>
              <p className="admin-confirm-text">
                "{deleteTarget.nombre_lanzamiento} — {deleteTarget.nombre_producto}" se eliminará por completo del catálogo y de la página de Colección. Esta acción no se puede deshacer.
              </p>
              <div className="admin-confirm-actions">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="admin-confirm-cancel">Cancelar</button>
                <button onClick={confirmarEliminar} disabled={deleting} className="admin-confirm-delete" style={{ opacity: deleting ? 0.7 : 1, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                  {deleting ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{ADMIN_STYLES}</style>
    </motion.div>
  );
};

export default ProductosPanel;
