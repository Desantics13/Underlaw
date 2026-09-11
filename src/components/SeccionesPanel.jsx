import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, LayoutGrid, ArrowUp, ArrowDown } from 'lucide-react';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#fff', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>Secciones de la Colección</h3>
        <button
          onClick={abrirCrear}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
        >
          <Plus size={16} /> Nueva Sección
        </button>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '2rem', maxWidth: '640px' }}>
        Las secciones aparecen como pestañas en /products (junto con "Todo"), en el orden de esta lista, y solo si tienen al menos un producto activo.
      </p>

      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem 0' }}>Cargando secciones...</p>
      ) : secciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
          <LayoutGrid size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>Aún no has creado ninguna sección.</p>
        </div>
      ) : (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
          {secciones.map((s, index) => (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
                borderBottom: index < secciones.length - 1 ? '1px solid #1e293b' : 'none'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button
                  onClick={() => moverSeccion(index, -1)}
                  disabled={index === 0 || reordenando}
                  aria-label="Subir"
                  style={{ background: 'transparent', border: 'none', color: index === 0 ? '#334155' : '#94a3b8', cursor: index === 0 ? 'not-allowed' : 'pointer', padding: '2px' }}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => moverSeccion(index, 1)}
                  disabled={index === secciones.length - 1 || reordenando}
                  aria-label="Bajar"
                  style={{ background: 'transparent', border: 'none', color: index === secciones.length - 1 ? '#334155' : '#94a3b8', cursor: index === secciones.length - 1 ? 'not-allowed' : 'pointer', padding: '2px' }}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <span style={{ flex: 1, color: '#e2e8f0', fontSize: '0.95rem' }}>{s.nombre}</span>
              <button onClick={() => abrirEditar(s)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3b82f6', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                <Pencil size={14} /> Renombrar
              </button>
              <button onClick={() => setDeleteTarget(s)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f43f5e', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                <Trash2 size={14} /> Eliminar
              </button>
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '90%', maxWidth: '400px', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2.5rem', zIndex: 301 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.4rem', color: '#fff', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
                  {editing ? 'Renombrar Sección' : 'Nueva Sección'}
                </h2>
                <button onClick={cerrarForm} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Nombre</label>
                  <input
                    type="text"
                    placeholder="Ej: Camisetas"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    autoFocus
                    style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', padding: '0.75rem 1rem', fontSize: '0.95rem' }}
                  />
                </div>

                {formError && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{formError}</p>}

                <button
                  type="submit"
                  disabled={saving}
                  style={{ marginTop: '0.5rem', padding: '0.9rem', background: saving ? '#334155' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                >
                  {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Sección'}
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '90%', maxWidth: '380px', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2.25rem', zIndex: 301, textAlign: 'center' }}
            >
              <Trash2 size={28} color="#f43f5e" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '0.75rem' }}>¿Eliminar esta sección?</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '2rem' }}>
                "{deleteTarget.nombre}" se eliminará. Los productos que la tengan asignada quedarán sin sección (no se borran).
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

export default SeccionesPanel;
