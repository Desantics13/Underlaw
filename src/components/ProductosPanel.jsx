import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, PauseCircle, PlayCircle, Trash2, X, ImagePlus, Package } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ESTADO_STYLES = {
  activo: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Activo' },
  suspendido: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Suspendido' }
};

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
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const cargarProductos = () => {
    setLoading(true);
    fetch(`${API_URL}/api/catalogo`)
      .then(res => res.json())
      .then(data => setProductos(data))
      .catch(err => console.error('Error al obtener el catálogo:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const abrirCrear = () => {
    setEditingProducto(null);
    setNombreLanzamiento(sugerirNombreLanzamiento(productos));
    setNombreProducto('');
    setPrecio('');
    setImagenFile(null);
    setImagenPreview(null);
    setFormError('');
    setShowForm(true);
  };

  const abrirEditar = (producto) => {
    setEditingProducto(producto);
    setNombreLanzamiento(producto.nombre_lanzamiento);
    setNombreProducto(producto.nombre_producto);
    setPrecio(String(producto.precio));
    setImagenFile(null);
    setImagenPreview(producto.imagen || null);
    setFormError('');
    setShowForm(true);
  };

  const cerrarForm = () => {
    if (saving) return;
    setShowForm(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
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
    if (!editingProducto && !imagenFile) {
      setFormError('Selecciona una imagen para el producto.');
      return;
    }

    const body = new FormData();
    body.append('nombre_lanzamiento', nombreLanzamiento.trim());
    body.append('nombre_producto', nombreProducto.trim());
    body.append('precio', precio);
    if (imagenFile) body.append('imagen', imagenFile);

    setSaving(true);
    try {
      const url = editingProducto ? `${API_URL}/api/catalogo/${editingProducto.id}` : `${API_URL}/api/catalogo`;
      const method = editingProducto ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body });
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
      const res = await fetch(`${API_URL}/api/catalogo/${producto.id}/estado`, {
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
      const res = await fetch(`${API_URL}/api/catalogo/${deleteTarget.id}`, { method: 'DELETE' });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#fff', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>Catálogo de Productos</h3>
        <button
          onClick={abrirCrear}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
        >
          <Plus size={16} /> Crear Producto
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem 0' }}>Cargando catálogo...</p>
      ) : productos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
          <Package size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>Aún no has creado ningún lanzamiento.</p>
        </div>
      ) : (
        <div className="productos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {productos.map(producto => {
            const estado = ESTADO_STYLES[producto.estado] || ESTADO_STYLES.activo;
            return (
              <div key={producto.id} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ aspectRatio: '3/4', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {producto.imagen ? (
                    <img src={producto.imagen} alt={producto.nombre_producto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Package size={32} color="#475569" />
                  )}
                </div>
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.2rem' }}>{producto.nombre_lanzamiento}</p>
                      <h4 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.1rem', color: '#fff' }}>{producto.nombre_producto}</h4>
                    </div>
                    <span style={{ flexShrink: 0, padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', background: estado.bg, color: estado.color }}>{estado.label}</span>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '0.75rem' }}>${Number(producto.precio).toLocaleString('es-CO')} COP</p>

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #1e293b' }}>
                    <button onClick={() => abrirEditar(producto)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3b82f6', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                      <Pencil size={14} /> Editar
                    </button>
                    <button onClick={() => toggleEstado(producto)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                      {producto.estado === 'activo' ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                      {producto.estado === 'activo' ? 'Suspender' : 'Activar'}
                    </button>
                    <button onClick={() => setDeleteTarget(producto)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f43f5e', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={cerrarForm}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '90%', maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2.5rem', zIndex: 301 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.4rem', color: '#fff', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
                  {editingProducto ? 'Editar Producto' : 'Crear Producto'}
                </h2>
                <button onClick={cerrarForm} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Nombre del lanzamiento</label>
                  <input
                    type="text"
                    value={nombreLanzamiento}
                    onChange={(e) => setNombreLanzamiento(e.target.value)}
                    style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', padding: '0.75rem 1rem', fontSize: '0.95rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Nombre del producto</label>
                  <input
                    type="text"
                    placeholder="Ej: Oversized Buddha Tee"
                    value={nombreProducto}
                    onChange={(e) => setNombreProducto(e.target.value)}
                    style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', padding: '0.75rem 1rem', fontSize: '0.95rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Precio (COP)</label>
                  <input
                    type="number"
                    min="1"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', padding: '0.75rem 1rem', fontSize: '0.95rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Imagen (JPG o PNG)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {imagenPreview && (
                      <img src={imagenPreview} alt="Vista previa" style={{ width: '60px', height: '75px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #334155' }} />
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0f172a', color: 'white', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      <ImagePlus size={15} /> {imagenFile ? 'Cambiar imagen' : 'Agregar imagen'}
                    </button>
                  </div>
                </div>

                {formError && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{formError}</p>}

                <button
                  type="submit"
                  disabled={saving}
                  style={{ marginTop: '0.5rem', padding: '0.9rem', background: saving ? '#334155' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                >
                  {saving ? 'Guardando...' : editingProducto ? 'Guardar Cambios' : 'Crear Producto'}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => !deleting && setDeleteTarget(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '90%', maxWidth: '380px', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2.25rem', zIndex: 301, textAlign: 'center' }}
            >
              <Trash2 size={28} color="#f43f5e" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.75rem' }}>¿Eliminar este producto?</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '2rem' }}>
                "{deleteTarget.nombre_lanzamiento} — {deleteTarget.nombre_producto}" se eliminará por completo del catálogo y de la página de Colección. Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid #334155', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminar}
                  disabled={deleting}
                  style={{ flex: 1, padding: '0.75rem', background: '#f43f5e', border: 'none', color: 'white', borderRadius: '8px', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '0.85rem', opacity: deleting ? 0.7 : 1 }}
                >
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProductosPanel;
