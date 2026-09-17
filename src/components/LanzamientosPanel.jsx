import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, ImagePlus, Rocket, Clock, CheckCircle } from 'lucide-react';
import ProductImageCarousel from './ProductImageCarousel';
import TallasEditor from './TallasEditor';
import { ADMIN_STYLES } from './adminStyles';
import { adminFetch, API_URL } from '../utils/adminApi';

const DETALLE_MAX = 120;
const TALLAS_DEFAULT = [
  { talla: 'S', cantidad: null },
  { talla: 'M', cantidad: null },
  { talla: 'L', cantidad: null },
  { talla: 'XL', cantidad: null }
];

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
  programado: { color: 'var(--gold)', label: 'Programado', Icon: Clock },
  lanzado: { color: 'var(--success)', label: 'Lanzado', Icon: CheckCircle }
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
  const [detalle, setDetalle] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tallas, setTallas] = useState(TALLAS_DEFAULT);
  const [seccionId, setSeccionId] = useState('');
  const [secciones, setSecciones] = useState([]);
  // Misma mecánica que ProductosPanel: { key, kind: 'existing'|'new', url, file? }
  const [imagenes, setImagenes] = useState([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const cargar = () => {
    setLoading(true);
    adminFetch('/api/lanzamientos')
      .then(res => res.json())
      .then(data => setLanzamientos(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error al obtener los lanzamientos:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    fetch(`${API_URL}/api/secciones`)
      .then(res => res.json())
      .then(data => setSecciones(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error al obtener las secciones:', err));
  }, []);

  const abrirCrear = () => {
    setEditing(null);
    setNombreLanzamiento('');
    setNombreProducto('');
    setPrecio('');
    setFechaLocal('');
    setActivoEnHome(false);
    setDetalle('');
    setDescripcion('');
    setTallas(TALLAS_DEFAULT);
    setSeccionId('');
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
    setDetalle(l.detalle || '');
    setDescripcion(l.descripcion || '');
    setTallas(l.tallas && l.tallas.length > 0 ? l.tallas : TALLAS_DEFAULT);
    setSeccionId(l.seccion_id ? String(l.seccion_id) : '');
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
    if (detalle.length > DETALLE_MAX) return setFormError(`El detalle no puede superar los ${DETALLE_MAX} caracteres.`);

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
    body.append('detalle', detalle.trim());
    body.append('descripcion', descripcion);
    body.append('tallas', JSON.stringify(tallas));
    body.append('seccion_id', seccionId);
    if (editing) {
      const aConservar = imagenes.filter((img) => img.kind === 'existing').map((img) => img.url);
      body.append('imagenes_conservar', JSON.stringify(aConservar));
    }
    imagenes.filter((img) => img.kind === 'new').forEach((img) => body.append('imagenes', img.file));

    setSaving(true);
    try {
      const url = editing ? `/api/lanzamientos/${editing.id}` : '/api/lanzamientos';
      const method = editing ? 'PUT' : 'POST';
      const res = await adminFetch(url, { method, body });
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
      const res = await adminFetch(`/api/lanzamientos/${l.id}/activo`, {
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
      const res = await adminFetch(`/api/lanzamientos/${deleteTarget.id}`, { method: 'DELETE' });
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
      <div className="admin-content-head">
        <div>
          <h1 className="admin-content-title">Lanzamientos</h1>
          <p className="admin-content-sub">
            Un lanzamiento controla la sección destacada del Home con una cuenta regresiva. No crea ningún producto:
            al llegar la fecha, el sistema publica el producto en el catálogo y avisa por correo a los inscritos.
          </p>
        </div>
        <button onClick={abrirCrear} className="admin-btn-create">
          <Plus size={15} /> Nuevo lanzamiento
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '3rem 0' }}>Cargando lanzamientos...</p>
      ) : lanzamientos.length === 0 ? (
        <div className="admin-empty">
          <Rocket size={32} />
          <p>Aún no has configurado ningún lanzamiento.</p>
        </div>
      ) : (
        <div className="admin-grid">
          {lanzamientos.map((l) => {
            const estado = ESTADO_STYLES[l.estado] || ESTADO_STYLES.programado;
            const imgs = (l.imagenes || []).map((i) => i.url);
            const editable = l.estado === 'programado';
            return (
              <div key={l.id} className="admin-tile">
                <div className="admin-tile-media">
                  {imgs.length > 0 ? (
                    <ProductImageCarousel images={imgs} alt={l.nombre_producto} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Rocket size={32} color="var(--text-dim)" />
                    </div>
                  )}
                </div>
                <div className="admin-tile-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }}>{l.nombre_lanzamiento}</p>
                      <p style={{ margin: '0.3rem 0 0', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.15rem' }}>{l.nombre_producto}</p>
                    </div>
                    <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', color: estado.color }}>
                      <estado.Icon size={12} /> {estado.label}
                    </span>
                  </div>
                  <p className="tabular" style={{ margin: '0.5rem 0 0', fontSize: '0.95rem' }}>${Number(l.precio).toLocaleString('es-CO')} COP</p>
                  <p style={{ margin: '0.3rem 0 0', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    {l.estado === 'lanzado' ? 'Lanzado el ' : 'Lanza el '}{formatFechaBogota(l.fecha_lanzamiento)} <span style={{ opacity: 0.7 }}>(hora Colombia)</span>
                  </p>

                  <button
                    onClick={() => toggleActivo(l)}
                    style={{
                      marginTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                      background: l.activo_en_home ? 'rgba(192,161,91,0.1)' : 'transparent',
                      border: `1px solid ${l.activo_en_home ? 'var(--gold)' : 'var(--border-strong)'}`,
                      color: l.activo_en_home ? 'var(--gold)' : 'var(--text-muted)',
                      padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'var(--font-sans)',
                      textTransform: 'uppercase', letterSpacing: '0.1em'
                    }}
                  >
                    Activo en el home
                    <span style={{ width: '32px', height: '18px', borderRadius: '9px', background: l.activo_en_home ? 'var(--gold)' : 'var(--border-strong)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: '2px', left: l.activo_en_home ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: 'var(--bg-primary)', transition: 'left 0.2s' }} />
                    </span>
                  </button>

                  <div className="admin-tile-actions">
                    <button onClick={() => abrirEditar(l)} className="admin-link-gold-plain" style={{ color: editable ? 'var(--gold)' : 'var(--text-muted)' }}>
                      <Pencil size={14} /> {editable ? 'Editar' : 'Ver detalle'}
                    </button>
                    <button onClick={() => setDeleteTarget(l)} className="admin-link-error" style={{ borderBottom: 'none' }}>
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
                <h2 className="admin-modal-title">
                  {editing ? (editing.estado === 'programado' ? 'Editar lanzamiento' : 'Detalle del lanzamiento') : 'Nuevo lanzamiento'}
                </h2>
                <button onClick={cerrarForm} className="admin-modal-close" aria-label="Cerrar"><X size={22} /></button>
              </div>

              {editing && editing.estado !== 'programado' && (
                <p style={{ color: 'var(--gold)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                  Este lanzamiento ya se publicó en el catálogo y no se puede editar.
                </p>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
                {[
                  { label: 'Nombre del lanzamiento', value: nombreLanzamiento, set: setNombreLanzamiento, placeholder: 'Ej: Lanzamiento 3', type: 'text' },
                  { label: 'Nombre del producto', value: nombreProducto, set: setNombreProducto, placeholder: 'Ej: Oversized Buddha Tee', type: 'text' },
                ].map(({ label, value, set, placeholder, type }) => (
                  <label key={label} className="admin-field">
                    <span>{label}</span>
                    <input
                      type={type} value={value} placeholder={placeholder}
                      onChange={(e) => set(e.target.value)}
                      disabled={editing && editing.estado !== 'programado'}
                    />
                  </label>
                ))}

                <label className="admin-field">
                  <span>Precio (COP)</span>
                  <input
                    type="number" min="1" value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    disabled={editing && editing.estado !== 'programado'}
                  />
                </label>

                <label className="admin-field">
                  <span>Fecha y hora de lanzamiento (hora Colombia)</span>
                  <input
                    type="datetime-local" value={fechaLocal}
                    onChange={(e) => setFechaLocal(e.target.value)}
                    disabled={editing && editing.estado !== 'programado'}
                    style={{ colorScheme: 'dark' }}
                  />
                </label>

                <label className="admin-field">
                  <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Detalle (frase corta)</span><span style={{ color: 'var(--text-dim)' }}>{detalle.length}/{DETALLE_MAX}</span>
                  </span>
                  <input
                    type="text" value={detalle} maxLength={DETALLE_MAX}
                    placeholder="Ej: Edición limitada, tela premium"
                    onChange={(e) => setDetalle(e.target.value)}
                    disabled={editing && editing.estado !== 'programado'}
                  />
                </label>

                <label className="admin-field">
                  <span>Descripción</span>
                  <textarea
                    value={descripcion} rows={4}
                    onChange={(e) => setDescripcion(e.target.value)}
                    disabled={editing && editing.estado !== 'programado'}
                    placeholder="Descripción completa del producto"
                  />
                </label>

                <div className="admin-field">
                  <span>Tallas</span>
                  <TallasEditor tallas={tallas} onChange={(editing && editing.estado !== 'programado') ? () => {} : setTallas} />
                </div>

                <label className="admin-field">
                  <span>Sección (opcional)</span>
                  <select
                    value={seccionId}
                    onChange={(e) => setSeccionId(e.target.value)}
                    disabled={editing && editing.estado !== 'programado'}
                  >
                    <option value="">Sin sección</option>
                    {secciones.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </label>

                <div className="admin-field">
                  <span>Imágenes (JPG o PNG, puedes elegir varias)</span>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {imagenes.map((img) => (
                      <div key={img.key} style={{ position: 'relative' }}>
                        <img src={img.url} alt="Vista previa" style={{ width: '60px', height: '75px', objectFit: 'cover', border: '1px solid var(--border-strong)', display: 'block' }} />
                        {imagenes.length > 1 && (!editing || editing.estado === 'programado') && (
                          <button type="button" onClick={() => quitarImagen(img.key)} aria-label="Quitar esta imagen"
                            style={{ position: 'absolute', top: '-7px', right: '-7px', width: '19px', height: '19px', borderRadius: '50%', background: 'var(--error)', border: '1px solid var(--bg-secondary)', color: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                    {(!editing || editing.estado === 'programado') && (
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '0.65rem 1rem', border: '1px solid var(--border-strong)', cursor: 'pointer', fontSize: '0.76rem', fontFamily: 'var(--font-sans)' }}>
                        <ImagePlus size={15} /> Agregar imágenes
                      </button>
                    )}
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={activoEnHome}
                    onChange={(e) => setActivoEnHome(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--gold)' }}
                  />
                  Activar en el home (muestra este lanzamiento en la portada)
                </label>

                {formError && <p className="admin-error">{formError}</p>}

                {(!editing || editing.estado === 'programado') && (
                  <button type="submit" disabled={saving} className="premium-button" style={{ marginTop: '0.5rem', opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear lanzamiento'}
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
            className="admin-modal-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="admin-confirm-modal"
            >
              <Trash2 size={28} color="var(--error)" style={{ marginBottom: '1rem' }} />
              <h3 className="admin-confirm-title">¿Eliminar este lanzamiento?</h3>
              <p className="admin-confirm-text">
                "{deleteTarget.nombre_lanzamiento} — {deleteTarget.nombre_producto}" se eliminará junto con sus inscritos.
                {deleteTarget.estado === 'lanzado' && ' El producto ya publicado en el catálogo NO se elimina.'}
                {' '}Esta acción no se puede deshacer.
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

export default LanzamientosPanel;
