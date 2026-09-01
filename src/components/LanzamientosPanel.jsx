import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, ImagePlus, Rocket, Clock, CheckCircle } from 'lucide-react';
import ProductImageCarousel from './ProductImageCarousel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// El negocio opera en Colombia (UTC-5, sin horario de verano). La fecha se
// guarda en UTC en el backend; acá se convierte en ambos sentidos para que el
// admin siempre vea y escriba hora de Colombia sin importar la zona de su equipo.
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

// "2026-09-01T15:30" (hora Colombia, del <input datetime-local>) -> ISO UTC
const bogotaLocalToUtcIso = (local) => {
  if (!local) return null;
  const d = new Date(`${local}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// ISO UTC del backend -> "2026-09-01T15:30" para precargar el <input datetime-local>
const utcIsoToBogotaLocal = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 16);
};

const formatFechaBogota = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  });
};

const ESTADO_STYLES = {
  programado: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Programado', Icon: Clock },
  lanzado: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Lanzado', Icon: CheckCircle }
};

const LanzamientosPanel = () => {
  const [lanzamientos, setLanzamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [nombreLanzamiento, setNombreLanzamiento] = useState('');
  const [nombreProducto, setNombreProducto] = useState('');
  const [precio, setPrecio] = useState('');
  const [fechaLocal, setFechaLocal] = useState('');
  const [activoEnHome, setActivoEnHome] = useState(false);
  // Misma mecánica que ProductosPanel: { key, kind: 'existing'|'new', url, file? }
  const [imagenes, setImagenes] = useState([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const cargar = () => {
    setLoading(true);
    fetch(`${API_URL}/api/lanzamientos`)
      .then(res => res.json())
      .then(data => setLanzamientos(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error al obtener los lanzamientos:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setEditing(null);
    setNombreLanzamiento('');
    setNombreProducto('');
    setPrecio('');
    setFechaLocal('');
    setActivoEnHome(false);
    setImagenes([]);
    setFormError('');
    setShowForm(true);
  };

  const abrirEditar = (l) => {
    setEditing(l);
    setNombreLanzamiento(l.nombre_lanzamiento);
    setNombreProducto(l.nombre_producto);
    setPrecio(String(l.precio));
    setFechaLocal(utcIsoToBogotaLocal(l.fecha_lanzamiento));
    setActivoEnHome(!!l.activo_en_home);
    setImagenes((l.imagenes || []).map((img) => ({ key: img.url, kind: 'existing', url: img.url })));
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

    if (!nombreLanzamiento.trim()) return setFormError('El nombre del lanzamiento es requerido.');
    if (!nombreProducto.trim()) return setFormError('El nombre del producto es requerido.');
    if (!precio || Number(precio) <= 0) return setFormError('El precio debe ser un número mayor a 0.');
    if (!fechaLocal) return setFormError('Elige la fecha y hora de lanzamiento.');
    if (imagenes.length === 0) return setFormError('Selecciona al menos una imagen.');

    const fechaIso = bogotaLocalToUtcIso(fechaLocal);
    if (!fechaIso) return setFormError('La fecha y hora de lanzamiento no es válida.');
    if (!editing && new Date(fechaIso).getTime() <= Date.now()) {
      return setFormError('La fecha y hora de lanzamiento debe estar en el futuro.');
    }

    const body = new FormData();
    body.append('nombre_lanzamiento', nombreLanzamiento.trim());
    body.append('nombre_producto', nombreProducto.trim());
    body.append('precio', precio);
    body.append('fecha_lanzamiento', fechaIso);
    body.append('activo_en_home', activoEnHome ? 'true' : 'false');
    if (editing) {
      const aConservar = imagenes.filter((img) => img.kind === 'existing').map((img) => img.url);
      body.append('imagenes_conservar', JSON.stringify(aConservar));
    }
    imagenes.filter((img) => img.kind === 'new').forEach((img) => body.append('imagenes', img.file));

    setSaving(true);
    try {
      const url = editing ? `${API_URL}/api/lanzamientos/${editing.id}` : `${API_URL}/api/lanzamientos`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el lanzamiento');

      // Al crear/editar con "activo en home" el backend apaga los demás:
      // recargar la lista completa para reflejarlo.
      cargar();
      setShowForm(false);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (l) => {
    try {
      const res = await fetch(`${API_URL}/api/lanzamientos/${l.id}/activo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !l.activo_en_home })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar');
      cargar();
    } catch (error) {
      console.error('Error al cambiar "activo en home":', error);
    }
  };

  const confirmarEliminar = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/lanzamientos/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo eliminar el lanzamiento');
      }
      setLanzamientos(prev => prev.filter(l => l.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error al eliminar lanzamiento:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#fff', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>Lanzar Producto</h3>
        <button
          onClick={abrirCrear}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
        >
          <Plus size={16} /> Configurar Lanzamiento
        </button>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '2rem', maxWidth: '640px' }}>
        Un lanzamiento controla la sección destacada del Home con una cuenta regresiva. No crea ningún producto:
        al llegar la fecha, el sistema publica el producto en el catálogo y avisa por correo a los inscritos.
      </p>

      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem 0' }}>Cargando lanzamientos...</p>
      ) : lanzamientos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
          <Rocket size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>Aún no has configurado ningún lanzamiento.</p>
        </div>
      ) : (
        <div className="productos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {lanzamientos.map((l) => {
            const estado = ESTADO_STYLES[l.estado] || ESTADO_STYLES.programado;
            const imgs = (l.imagenes || []).map((i) => i.url);
            const editable = l.estado === 'programado';
            return (
              <div key={l.id} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ aspectRatio: '3/4', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {imgs.length > 0 ? <ProductImageCarousel images={imgs} alt={l.nombre_producto} /> : <Rocket size={32} color="#475569" />}
                </div>
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.2rem' }}>{l.nombre_lanzamiento}</p>
                      <h4 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.1rem', color: '#fff' }}>{l.nombre_producto}</h4>
                    </div>
                    <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', background: estado.bg, color: estado.color }}>
                      <estado.Icon size={12} /> {estado.label}
                    </span>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>${Number(l.precio).toLocaleString('es-CO')} COP</p>
                  <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    {l.estado === 'lanzado' ? 'Lanzado el ' : 'Lanza el '}{formatFechaBogota(l.fecha_lanzamiento)} <span style={{ opacity: 0.6 }}>(hora Colombia)</span>
                  </p>

                  <button
                    onClick={() => toggleActivo(l)}
                    style={{
                      marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                      background: l.activo_en_home ? 'rgba(59,130,246,0.12)' : 'transparent',
                      border: `1px solid ${l.activo_en_home ? '#3b82f6' : '#334155'}`,
                      color: l.activo_en_home ? '#3b82f6' : '#94a3b8',
                      padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500
                    }}
                  >
                    Activo en el Home
                    <span style={{ width: '32px', height: '18px', borderRadius: '999px', background: l.activo_en_home ? '#3b82f6' : '#334155', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: '2px', left: l.activo_en_home ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </span>
                  </button>

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #1e293b' }}>
                    <button onClick={() => abrirEditar(l)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: editable ? '#3b82f6' : '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                      <Pencil size={14} /> {editable ? 'Editar' : 'Ver detalle'}
                    </button>
                    <button onClick={() => setDeleteTarget(l)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f43f5e', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '90%', maxWidth: '460px', maxHeight: '85vh', overflowY: 'auto', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2.5rem', zIndex: 301 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.4rem', color: '#fff', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
                  {editing ? (editing.estado === 'programado' ? 'Editar Lanzamiento' : 'Detalle del Lanzamiento') : 'Configurar Lanzamiento'}
                </h2>
                <button onClick={cerrarForm} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
              </div>

              {editing && editing.estado !== 'programado' && (
                <p style={{ color: '#f59e0b', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                  Este lanzamiento ya se publicó en el catálogo y no se puede editar.
                </p>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {[
                  { label: 'Nombre del lanzamiento', value: nombreLanzamiento, set: setNombreLanzamiento, placeholder: 'Ej: Lanzamiento 3', type: 'text' },
                  { label: 'Nombre del producto', value: nombreProducto, set: setNombreProducto, placeholder: 'Ej: Oversized Buddha Tee', type: 'text' },
                ].map(({ label, value, set, placeholder, type }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>{label}</label>
                    <input
                      type={type} value={value} placeholder={placeholder}
                      onChange={(e) => set(e.target.value)}
                      disabled={editing && editing.estado !== 'programado'}
                      style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', padding: '0.75rem 1rem', fontSize: '0.95rem' }}
                    />
                  </div>
                ))}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Precio (COP)</label>
                  <input
                    type="number" min="1" value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    disabled={editing && editing.estado !== 'programado'}
                    style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', padding: '0.75rem 1rem', fontSize: '0.95rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Fecha y hora de lanzamiento (hora Colombia)</label>
                  <input
                    type="datetime-local" value={fechaLocal}
                    onChange={(e) => setFechaLocal(e.target.value)}
                    disabled={editing && editing.estado !== 'programado'}
                    style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', padding: '0.75rem 1rem', fontSize: '0.95rem', colorScheme: 'dark' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Imágenes (JPG o PNG, puedes elegir varias)</label>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {imagenes.map((img) => (
                      <div key={img.key} style={{ position: 'relative' }}>
                        <img src={img.url} alt="Vista previa" style={{ width: '60px', height: '75px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #334155', display: 'block' }} />
                        {imagenes.length > 1 && (!editing || editing.estado === 'programado') && (
                          <button type="button" onClick={() => quitarImagen(img.key)} aria-label="Quitar esta imagen"
                            style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: '#f43f5e', border: '1px solid #1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                    {(!editing || editing.estado === 'programado') && (
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0f172a', color: 'white', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.8rem' }}>
                        <ImagePlus size={15} /> Agregar imágenes
                      </button>
                    )}
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#e2e8f0', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={activoEnHome}
                    onChange={(e) => setActivoEnHome(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                  />
                  Activar en el Home (muestra este lanzamiento en la portada)
                </label>

                {formError && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{formError}</p>}

                {(!editing || editing.estado === 'programado') && (
                  <button type="submit" disabled={saving}
                    style={{ marginTop: '0.5rem', padding: '0.9rem', background: saving ? '#334155' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                    {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Lanzamiento'}
                  </button>
                )}
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '90%', maxWidth: '380px', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2.25rem', zIndex: 301, textAlign: 'center' }}
            >
              <Trash2 size={28} color="#f43f5e" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.75rem' }}>¿Eliminar este lanzamiento?</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '2rem' }}>
                "{deleteTarget.nombre_lanzamiento} — {deleteTarget.nombre_producto}" se eliminará junto con sus inscritos.
                {deleteTarget.estado === 'lanzado' && ' El producto ya publicado en el catálogo NO se elimina.'}
                {' '}Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                  style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid #334155', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Cancelar
                </button>
                <button onClick={confirmarEliminar} disabled={deleting}
                  style={{ flex: 1, padding: '0.75rem', background: '#f43f5e', border: 'none', color: 'white', borderRadius: '8px', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '0.85rem', opacity: deleting ? 0.7 : 1 }}>
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

export default LanzamientosPanel;
