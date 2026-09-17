import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, LayoutGrid, ArrowUp, ArrowDown } from 'lucide-react';
import { ADMIN_STYLES } from './adminStyles';
import { adminFetch } from '../utils/adminApi';

// Panel de administración de "Secciones de la Colección": crear, renombrar,
// ordenar (subir/bajar) y borrar. El orden se guarda en BD (columna "orden")
// y es el mismo que usan las pestañas de /products.
const SeccionesPanel = () => {
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [nombre, setNombre] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reordenando, setReordenando] = useState(false);

  const cargar = () => {
    setLoading(true);
    adminFetch('/api/secciones')
      .then(res => res.json())
      .then(data => setSecciones(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error al obtener las secciones:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setEditing(null);
    setNombre('');
    setFormError('');
    setShowForm(true);
  };

  const abrirEditar = (s) => {
    setEditing(s);
    setNombre(s.nombre);
    setFormError('');
    setShowForm(true);
  };

  const cerrarForm = () => {
    if (saving) return;
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!nombre.trim()) return setFormError('El nombre de la sección es requerido.');

    setSaving(true);
    try {
      const url = editing ? `/api/secciones/${editing.id}` : '/api/secciones';
      const method = editing ? 'PUT' : 'POST';
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la sección');
      cargar();
      setShowForm(false);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Intercambia el "orden" de dos secciones consecutivas (subir/bajar en la lista).
  const moverSeccion = async (index, delta) => {
    const destino = index + delta;
    if (destino < 0 || destino >= secciones.length || reordenando) return;

    setReordenando(true);
    const actual = secciones[index];
    const vecino = secciones[destino];
    try {
      await Promise.all([
        adminFetch(`/api/secciones/${actual.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: actual.nombre, orden: vecino.orden })
        }),
        adminFetch(`/api/secciones/${vecino.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: vecino.nombre, orden: actual.orden })
        })
      ]);
      cargar();
    } catch (error) {
      console.error('Error al reordenar secciones:', error);
    } finally {
      setReordenando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/secciones/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo eliminar la sección');
      }
      setSecciones(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error al eliminar sección:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="admin-content-head">
        <div>
          <h1 className="admin-content-title">Secciones de la colección</h1>
          <p className="admin-content-sub">Aparecen como pestañas en la Colección, en el orden de esta lista, y solo si tienen al menos un producto activo.</p>
        </div>
        <button onClick={abrirCrear} className="admin-btn-create">
          <Plus size={15} /> Nueva sección
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '3rem 0' }}>Cargando secciones...</p>
      ) : secciones.length === 0 ? (
        <div className="admin-empty">
          <LayoutGrid size={32} />
          <p>Aún no has creado ninguna sección.</p>
        </div>
      ) : (
        <div className="admin-list">
          {secciones.map((s, index) => (
            <div key={s.id} className="admin-list-row">
              <span style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <button
                  onClick={() => moverSeccion(index, -1)}
                  disabled={index === 0 || reordenando}
                  aria-label="Subir"
                  style={{ background: 'transparent', border: 'none', color: index === 0 ? 'var(--border-strong)' : 'var(--text-muted)', cursor: index === 0 ? 'not-allowed' : 'pointer', padding: '2px', display: 'flex' }}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => moverSeccion(index, 1)}
                  disabled={index === secciones.length - 1 || reordenando}
                  aria-label="Bajar"
                  style={{ background: 'transparent', border: 'none', color: index === secciones.length - 1 ? 'var(--border-strong)' : 'var(--text-muted)', cursor: index === secciones.length - 1 ? 'not-allowed' : 'pointer', padding: '2px', display: 'flex' }}
                >
                  <ArrowDown size={14} />
                </button>
              </span>
              <span style={{ flex: '1 1 180px', minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: '1.15rem' }}>{s.nombre}</span>
              </span>
              <span style={{ flex: '0 0 auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button onClick={() => abrirEditar(s)} className="admin-link-gold-plain">
                  <Pencil size={14} /> Renombrar
                </button>
                <button onClick={() => setDeleteTarget(s)} className="admin-link-error">
                  <Trash2 size={14} /> Eliminar
                </button>
              </span>
            </div>
          ))}
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
              style={{ maxWidth: '400px' }}
            >
              <div className="admin-modal-head">
                <h2 className="admin-modal-title">{editing ? 'Renombrar sección' : 'Nueva sección'}</h2>
                <button onClick={cerrarForm} className="admin-modal-close" aria-label="Cerrar"><X size={22} /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <label className="admin-field">
                  <span>Nombre</span>
                  <input type="text" placeholder="Ej: Camisetas" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
                </label>

                {formError && <p className="admin-error">{formError}</p>}

                <button type="submit" disabled={saving} className="premium-button" style={{ marginTop: '0.5rem', opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear sección'}
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
              <h3 className="admin-confirm-title">¿Eliminar esta sección?</h3>
              <p className="admin-confirm-text">
                "{deleteTarget.nombre}" se eliminará. Los productos que la tengan asignada quedarán sin sección (no se borran).
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

export default SeccionesPanel;
