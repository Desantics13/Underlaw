import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, LogOut, X } from 'lucide-react';
import logoUnderlaw from '../assets/logo-underlaw.jpg';
import ProductosPanel from '../components/ProductosPanel';
import LanzamientosPanel from '../components/LanzamientosPanel';
import SeccionesPanel from '../components/SeccionesPanel';
import InventarioPanel from '../components/InventarioPanel';
import { ADMIN_STYLES } from '../components/adminStyles';
import { API_URL, adminFetch, getAdminToken, setAdminToken, clearAdminToken, onAdminSessionExpired } from '../utils/adminApi';

const ESTADO_LABELS = {
  APPROVED: 'Aprobado',
  PENDING: 'Pendiente',
  DECLINED: 'Cancelada',
  VOIDED: 'Cancelada',
  ERROR: 'Cancelada'
};

const ESTADO_COLOR = { Aprobado: 'var(--success)', Pendiente: 'var(--gold)', Cancelada: 'var(--error)' };

const PEDIDOS_POR_PAGINA = 8;

const TABS = [
  ['pedidos', 'Pedidos'],
  ['productos', 'Productos'],
  ['lanzamientos', 'Lanzamientos'],
  ['secciones', 'Secciones'],
  ['inventario', 'Inventario']
];

const TITULOS = {
  pedidos: ['Pedidos', 'Resumen de ventas y historial de compras.'],
  productos: ['Catálogo de productos', 'Crea, edita, suspende o elimina cada pieza del catálogo.'],
  lanzamientos: ['Lanzamientos', 'Programa los drops, su imagen y su fecha de apertura.'],
  secciones: ['Secciones de la colección', 'Aparecen como pestañas en la Colección, en el orden de esta lista, y solo si tienen al menos un producto activo.'],
  inventario: ['Inventario', 'Carga las cantidades por talla de cada producto y de los próximos lanzamientos.']
};

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAdminToken());
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [selectedDireccion, setSelectedDireccion] = useState(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [activeView, setActiveView] = useState('pedidos');
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Si el backend responde 401 en cualquier llamada del Admin (token vencido
  // o ausente), volvemos a la pantalla de login.
  useEffect(() => onAdminSessionExpired(() => setIsAuthenticated(false)), []);

  const cargarNotificaciones = () => {
    adminFetch('/api/notificaciones')
      .then(res => res.json())
      .then(data => setNotificaciones(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error al obtener notificaciones:', err));
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    cargarNotificaciones();
    // Refresca la campanita cada 20s para reflejar compras hechas desde otros dispositivos/navegadores
    const interval = setInterval(cargarNotificaciones, 20000);

    // Obtener pedidos del Backend real
    adminFetch('/api/pedidos')
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        const formattedData = data.map(p => ({
          id: p.id,
          nombre_cliente: p.nombre_cliente,
          apellido_cliente: p.apellido_cliente,
          correo_cliente: p.correo_cliente,
          telefono_cliente: p.telefono_cliente,
          cliente: `${p.nombre_cliente} ${p.apellido_cliente}`,
          producto: p.nombre_producto,
          talla: p.talla || '',
          precio: p.precio_producto,
          metodo_pago: p.metodo_pago || 'No especificado',
          fecha: new Date(p.fecha_compra).toISOString().split('T')[0],
          estado: ESTADO_LABELS[p.estado_pago] || ESTADO_LABELS.PENDING,
          pais: p.pais || '',
          municipio: p.municipio || '',
          ciudad: p.ciudad || '',
          direccion: p.direccion_envio || ''
        }));
        setPedidos(formattedData);
        setPaginaActual(1);
      })
      .catch(err => console.error('Error al obtener pedidos del backend:', err));

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Contraseña incorrecta. Intenta de nuevo.');
      }
      setAdminToken(data.token);
      setIsAuthenticated(true);
      setPassword('');
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    setIsAuthenticated(false);
    setPassword('');
  };

  const markAllRead = () => {
    adminFetch('/api/notificaciones/marcar-leidas', { method: 'PATCH' })
      .then(() => setNotificaciones(prev => prev.map(n => ({ ...n, leida: 1 }))))
      .catch(err => console.error('Error al marcar notificaciones como leídas:', err));
  };

  const clearNotifications = () => {
    adminFetch('/api/notificaciones', { method: 'DELETE' })
      .then(() => {
        setNotificaciones([]);
        setShowNotifications(false);
      })
      .catch(err => console.error('Error al borrar notificaciones:', err));
  };

  const unreadCount = notificaciones.filter(n => !n.leida).length;
  const totalIngresos = pedidos.filter(p => p.estado === 'Aprobado').reduce((sum, p) => sum + Number(p.precio), 0);

  const totalPaginas = Math.max(1, Math.ceil(pedidos.length / PEDIDOS_POR_PAGINA));
  const pedidosPagina = pedidos.slice((paginaActual - 1) * PEDIDOS_POR_PAGINA, paginaActual * PEDIDOS_POR_PAGINA);

  // ── PANTALLA DE LOGIN ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="admin-login-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-login-card"
        >
          <img src={logoUnderlaw} alt="Under Law" className="admin-login-logo" />
          <h1 className="font-serif" style={{ fontStyle: 'italic', fontSize: '2.4rem', textAlign: 'center', marginBottom: '0.5rem' }}>UnderLaw</h1>
          <p className="eyebrow" style={{ textAlign: 'center', display: 'block', marginBottom: '2.75rem' }}>Panel administrativo</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <label className="admin-field">
              <span>Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                style={{ letterSpacing: '0.2em' }}
              />
            </label>
            {loginError && <p className="admin-error" style={{ textAlign: 'center' }}>{loginError}</p>}
            <button type="submit" disabled={loggingIn} className="premium-button" style={{ width: '100%', opacity: loggingIn ? 0.6 : 1, cursor: loggingIn ? 'not-allowed' : 'pointer' }}>
              {loggingIn ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </motion.div>
        <style>{ADMIN_STYLES}</style>
      </div>
    );
  }

  // ── DASHBOARD PRINCIPAL ────────────────────────────────────────────────────
  const [tituloVista, subtituloVista] = TITULOS[activeView];

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-top">
          <div className="admin-brand">
            <img src={logoUnderlaw} alt="Under Law" className="admin-brand-logo" />
            <div>
              <p className="admin-brand-name">UnderLaw</p>
              <p className="admin-brand-sub">Administración</p>
            </div>
          </div>

          <div className="admin-header-actions">
            <div className="admin-notif" ref={notifRef}>
              <button onClick={() => setShowNotifications((p) => !p)} aria-label="Notificaciones" className="admin-icon-btn">
                <Bell size={18} />
                {unreadCount > 0 && <span className="admin-notif-badge">{unreadCount}</span>}
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="admin-notif-panel"
                  >
                    <div className="admin-notif-head">
                      <span className="eyebrow">Notificaciones</span>
                      <div style={{ display: 'flex', gap: '0.85rem' }}>
                        <button onClick={markAllRead} className="admin-link-gold" style={{ borderBottom: 'none' }}>Marcar leídas</button>
                        <button onClick={clearNotifications} className="admin-link-muted">Borrar</button>
                      </div>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {notificaciones.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Sin notificaciones nuevas</p>
                      ) : (
                        notificaciones.map((n) => (
                          <div key={n.id} className="admin-notif-item" style={{ background: n.leida ? 'transparent' : 'rgba(192,161,91,0.06)' }}>
                            <span className="admin-notif-dot" style={{ background: n.leida ? 'var(--border-strong)' : 'var(--gold)' }} />
                            <div>
                              <p style={{ fontSize: '0.85rem', lineHeight: 1.5, margin: 0, color: 'var(--text-secondary)' }}>{n.mensaje}</p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0.25rem 0 0' }}>{new Date(n.fecha_creacion).toLocaleString('es-CO')}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={handleLogout} aria-label="Cerrar sesión" className="admin-icon-btn">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="admin-tabs">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className={`admin-tab ${activeView === key ? 'admin-tab-activa' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="admin-content">
        {activeView === 'productos' ? (
          <ProductosPanel />
        ) : activeView === 'lanzamientos' ? (
          <LanzamientosPanel />
        ) : activeView === 'secciones' ? (
          <SeccionesPanel />
        ) : activeView === 'inventario' ? (
          <InventarioPanel />
        ) : (
          <>
            <div className="admin-content-head">
              <div>
                <h1 className="admin-content-title">{tituloVista}</h1>
                <p className="admin-content-sub">{subtituloVista}</p>
              </div>
            </div>

            {/* Tarjetas de Resumen */}
            <div className="admin-stats-grid">
              <div className="admin-stat-cell">
                <p className="admin-stat-label">Pedidos totales</p>
                <p className="admin-stat-value tabular">{pedidos.length}</p>
              </div>
              <div className="admin-stat-cell">
                <p className="admin-stat-label">Ingresos aprobados</p>
                <p className="admin-stat-value tabular" style={{ color: 'var(--gold)' }}>${totalIngresos.toLocaleString('es-CO')}</p>
              </div>
              <div className="admin-stat-cell">
                <p className="admin-stat-label">Clientes</p>
                <p className="admin-stat-value tabular">{new Set(pedidos.map(p => p.correo_cliente)).size}</p>
              </div>
            </div>

            {/* Tabla de Pedidos */}
            <div className="admin-card">
              <div className="admin-card-head">
                <h2 className="admin-card-title">Historial de pedidos</h2>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Producto</th>
                      <th>Talla</th>
                      <th>Precio</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Dirección</th>
                      <th>Datos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosPagina.map((pedido, index) => {
                      const iniciales = (pedido.nombre_cliente?.[0] || '') + (pedido.apellido_cliente?.[0] || '');
                      const color = ESTADO_COLOR[pedido.estado] || 'var(--gold)';
                      return (
                        <tr key={index}>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              <span className="admin-avatar">{iniciales.toUpperCase()}</span>
                              <span style={{ fontSize: '0.9rem' }}>{pedido.cliente}</span>
                            </span>
                          </td>
                          <td>{pedido.producto}</td>
                          <td style={{ color: 'var(--text-tertiary)' }}>{pedido.talla || '—'}</td>
                          <td className="tabular">${Number(pedido.precio).toLocaleString('es-CO')}</td>
                          <td style={{ color: 'var(--text-tertiary)' }}>{pedido.fecha}</td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />{pedido.estado}
                            </span>
                          </td>
                          <td><button onClick={() => setSelectedDireccion(pedido)} className="admin-link-gold">Dirección</button></td>
                          <td><button onClick={() => setSelectedPedido(pedido)} className="admin-link-gold">Datos</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pedidos.length === 0 && (
                <p style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>No hay pedidos registrados aún.</p>
              )}

              {pedidos.length > 0 && (
                <div className="admin-pagination">
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Página {paginaActual} de {totalPaginas}</span>
                  <span style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                      className="admin-page-btn"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual === totalPaginas}
                      className="admin-page-btn"
                    >
                      Siguiente
                    </button>
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal de Detalles */}
      <AnimatePresence>
        {selectedPedido && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setSelectedPedido(null)}
            className="admin-modal-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="admin-modal"
            >
              <div className="admin-modal-head">
                <h2 className="admin-modal-title">Detalles del pedido</h2>
                <button onClick={() => setSelectedPedido(null)} className="admin-modal-close" aria-label="Cerrar"><X size={22} /></button>
              </div>
              <div className="admin-modal-rows">
                {[
                  { label: 'Nombre completo', value: selectedPedido.cliente },
                  { label: 'Correo', value: selectedPedido.correo_cliente },
                  { label: 'Teléfono', value: selectedPedido.telefono_cliente },
                  { label: 'Producto', value: selectedPedido.producto },
                  { label: 'Talla', value: selectedPedido.talla || '—' },
                  { label: 'Total pagado', value: `$${Number(selectedPedido.precio).toLocaleString('es-CO')} COP` },
                  { label: 'Método de pago', value: selectedPedido.metodo_pago },
                  { label: 'Fecha de compra', value: selectedPedido.fecha },
                  { label: 'Estado', value: selectedPedido.estado }
                ].map(({ label, value }) => (
                  <div key={label} className="admin-modal-row">
                    <span>{label}</span>
                    <span style={{ textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Dirección */}
      <AnimatePresence>
        {selectedDireccion && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setSelectedDireccion(null)}
            className="admin-modal-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="admin-modal"
            >
              <div className="admin-modal-head">
                <h2 className="admin-modal-title">Dirección de envío</h2>
                <button onClick={() => setSelectedDireccion(null)} className="admin-modal-close" aria-label="Cerrar"><X size={22} /></button>
              </div>
              <div className="admin-modal-rows">
                {[
                  { label: 'Cliente', value: selectedDireccion.cliente },
                  { label: 'País', value: selectedDireccion.pais || 'No registrado' },
                  { label: 'Municipio', value: selectedDireccion.municipio || 'No registrado' },
                  { label: 'Ciudad', value: selectedDireccion.ciudad || 'No registrado' },
                  { label: 'Dirección', value: selectedDireccion.direccion || 'No registrado' }
                ].map(({ label, value }) => (
                  <div key={label} className="admin-modal-row">
                    <span>{label}</span>
                    <span style={{ textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{ADMIN_STYLES}</style>
    </div>
  );
};

export default Admin;
