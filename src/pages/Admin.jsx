import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, LogOut, Bell, Settings, CheckCircle, Clock, User, X, Eye, LayoutDashboard } from 'lucide-react';
import ProductosPanel from '../components/ProductosPanel';

const ADMIN_PASSWORD = 'admin';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ESTADO_LABELS = {
  APPROVED: 'Aprobado',
  PENDING: 'Pendiente',
  DECLINED: 'Cancelada',
  VOIDED: 'Cancelada',
  ERROR: 'Cancelada'
};

const ESTADO_COLORS = {
  Aprobado: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  Pendiente: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  Cancelada: { bg: 'rgba(244,63,94,0.1)', color: '#f43f5e' }
};

const PEDIDOS_POR_PAGINA = 8;

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [pedidos, setPedidos] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [selectedDireccion, setSelectedDireccion] = useState(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [activeView, setActiveView] = useState('pedidos'); // 'pedidos' | 'productos'
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

  const cargarNotificaciones = () => {
    fetch(`${API_URL}/api/notificaciones`)
      .then(res => res.json())
      .then(data => setNotificaciones(data))
      .catch(err => console.error('Error al obtener notificaciones:', err));
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    cargarNotificaciones();
    // Refresca la campanita cada 20s para reflejar compras hechas desde otros dispositivos/navegadores
    const interval = setInterval(cargarNotificaciones, 20000);

    // Obtener pedidos del Backend real
    fetch(`${API_URL}/api/pedidos`)
      .then(res => res.json())
      .then(data => {
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

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Contraseña incorrecta. Intenta de nuevo.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
  };

  const markAllRead = () => {
    fetch(`${API_URL}/api/notificaciones/marcar-leidas`, { method: 'PATCH' })
      .then(() => setNotificaciones(prev => prev.map(n => ({ ...n, leida: 1 }))))
      .catch(err => console.error('Error al marcar notificaciones como leídas:', err));
  };

  const clearNotifications = () => {
    fetch(`${API_URL}/api/notificaciones`, { method: 'DELETE' })
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: '400px', padding: 'clamp(2rem, 5vw, 3rem)', border: '1px solid rgba(255,255,255,0.08)', background: '#0a0a0a', margin: '0 1.25rem' }}
        >
          <h1 className="font-serif italic" style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.5rem', color: '#fff' }}>Under Law</h1>
          <p style={{ textAlign: 'center', color: '#71717a', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '3rem' }}>Panel Administrativo</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#71717a' }}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0.75rem 0', fontSize: '1rem', letterSpacing: '0.2em' }}
              />
            </div>
            {loginError && (
              <p style={{ color: '#f43f5e', fontSize: '0.85rem', textAlign: 'center' }}>{loginError}</p>
            )}
            <button type="submit" className="premium-button" style={{ width: '100%', padding: '1.2rem', marginTop: '1rem' }}>
              Ingresar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ── DASHBOARD PRINCIPAL ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f111a', color: '#e2e8f0', paddingTop: '100px', fontFamily: 'var(--font-sans)' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.5rem' }}>Dashboard <span style={{ color: '#3b82f6' }}>Administrativo</span></h1>
            <p style={{ color: '#94a3b8' }}>Bienvenido de nuevo, UnderLaw Admin.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1e293b', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.85rem' }}>
              <BarChart3 size={16} /> Ver Análisis
            </button>

            {/* Campanita de Notificaciones */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                onClick={() => setShowNotifications(prev => !prev)}
                style={{ position: 'relative', background: '#1e293b', color: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer' }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#f43f5e', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '340px', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', zIndex: 200, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                  >
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Notificaciones</span>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Marcar leídas</button>
                        <button onClick={clearNotifications} style={{ fontSize: '0.75rem', color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer' }}>Borrar todo</button>
                      </div>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {notificaciones.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>Sin notificaciones nuevas</p>
                      ) : (
                        notificaciones.map(n => (
                          <div key={n.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(51,65,85,0.5)', background: n.leida ? 'transparent' : 'rgba(59,130,246,0.05)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            {!n.leida && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', marginTop: '6px', flexShrink: 0 }} />}
                            {n.leida && <div style={{ width: '8px', height: '8px', flexShrink: 0 }} />}
                            <div>
                              <p style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: '1.4' }}>{n.mensaje}</p>
                              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{new Date(n.fecha_creacion).toLocaleString('es-CO')}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setActiveView(prev => (prev === 'productos' ? 'pedidos' : 'productos'))}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: activeView === 'productos' ? '#3b82f6' : '#1e293b', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '8px', border: activeView === 'productos' ? '1px solid #3b82f6' : '1px solid #334155', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {activeView === 'productos' ? <><LayoutDashboard size={16} /> Ver Pedidos</> : <><Settings size={16} /> Productos</>}
            </button>

            <button onClick={handleLogout} title="Cerrar Sesión" style={{ background: '#1e293b', color: '#f43f5e', padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {activeView === 'productos' ? (
          <ProductosPanel />
        ) : (
        <>
        {/* Tarjetas de Resumen */}
        <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '3rem' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', border: '1px solid #334155', position: 'relative' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>Pedidos Totales</p>
            <h2 style={{ fontSize: '2.5rem', color: '#fff', margin: 0 }}>{pedidos.length}</h2>
            <div style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '0.75rem', borderRadius: '50%' }}><CheckCircle size={24} /></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', border: '1px solid #334155', position: 'relative' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>Ingresos Est.</p>
            <h2 style={{ fontSize: '2.5rem', color: '#fff', margin: 0 }}>${totalIngresos.toLocaleString('es-CO')}</h2>
            <div style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.75rem', borderRadius: '50%' }}><Clock size={24} /></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', border: '1px solid #334155', position: 'relative' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>Clientes Registrados</p>
            <h2 style={{ fontSize: '2.5rem', color: '#fff', margin: 0 }}>{new Set(pedidos.map(p => p.correo_cliente)).size}</h2>
            <div style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', padding: '0.75rem', borderRadius: '50%' }}><User size={24} /></div>
          </motion.div>
        </div>

        {/* Tabla de Pedidos */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '2rem' }}>Historial de Pedidos</h3>

          <div className="admin-table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.85rem' }}>
                <th style={{ paddingBottom: '1rem', paddingRight: '1rem', fontWeight: '500' }}>Cliente</th>
                <th style={{ paddingBottom: '1rem', paddingRight: '1rem', fontWeight: '500' }}>Producto</th>
                <th style={{ paddingBottom: '1rem', paddingRight: '1rem', fontWeight: '500' }}>Talla</th>
                <th style={{ paddingBottom: '1rem', paddingRight: '1rem', fontWeight: '500' }}>Precio</th>
                <th style={{ paddingBottom: '1rem', paddingRight: '1rem', fontWeight: '500' }}>Fecha</th>
                <th style={{ paddingBottom: '1rem', paddingRight: '1rem', fontWeight: '500' }}>Estado</th>
                <th style={{ paddingBottom: '1rem', paddingRight: '1rem', fontWeight: '500' }}>Dirección</th>
                <th style={{ paddingBottom: '1rem', fontWeight: '500' }}>Datos</th>
              </tr>
            </thead>
            <tbody>
              {pedidosPagina.map((pedido, index) => (
                <tr key={index} style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                  <td style={{ padding: '1.25rem 1rem 1.25rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={16} />
                    </div>
                    {pedido.cliente}
                  </td>
                  <td style={{ padding: '1.25rem 1rem 1.25rem 0' }}>{pedido.producto}</td>
                  <td style={{ padding: '1.25rem 1rem 1.25rem 0' }}>{pedido.talla || '—'}</td>
                  <td style={{ padding: '1.25rem 1rem 1.25rem 0' }}>${Number(pedido.precio).toLocaleString('es-CO')}</td>
                  <td style={{ padding: '1.25rem 1rem 1.25rem 0' }}>{pedido.fecha}</td>
                  <td style={{ padding: '1.25rem 1rem 1.25rem 0' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', background: (ESTADO_COLORS[pedido.estado] || ESTADO_COLORS.Pendiente).bg, color: (ESTADO_COLORS[pedido.estado] || ESTADO_COLORS.Pendiente).color }}>
                      {pedido.estado}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1rem 1.25rem 0' }}>
                    <button
                      onClick={() => setSelectedDireccion(pedido)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3b82f6', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' }}
                    >
                      <Eye size={15} /> Ver Dirección
                    </button>
                  </td>
                  <td style={{ padding: '1.25rem 0' }}>
                    <button
                      onClick={() => setSelectedPedido(pedido)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3b82f6', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' }}
                    >
                      <Eye size={15} /> Ver datos
                    </button>
                  </td>
                </tr>
              ))}
              {pedidos.length === 0 && (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>No hay pedidos registrados aún.</td></tr>
              )}
            </tbody>
          </table>
          </div>

          {pedidos.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #334155' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Página {paginaActual} de {totalPaginas}</span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  style={{ padding: '0.5rem 1rem', background: '#1e293b', color: paginaActual === 1 ? '#475569' : 'white', border: '1px solid #334155', borderRadius: '6px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  style={{ padding: '0.5rem 1rem', background: '#1e293b', color: paginaActual === totalPaginas ? '#475569' : 'white', border: '1px solid #334155', borderRadius: '6px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </motion.div>
        </>
        )}
      </div>

      {/* Modal de Detalles */}
      <AnimatePresence>
        {selectedPedido && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setSelectedPedido(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '90%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2.5rem', zIndex: 301 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', color: '#fff', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>Detalles del Pedido</h2>
                <button onClick={() => setSelectedPedido(null)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {[
                  { label: 'Nombre completo', value: selectedPedido.cliente },
                  { label: 'Correo electrónico', value: selectedPedido.correo_cliente },
                  { label: 'Teléfono', value: selectedPedido.telefono_cliente },
                  { label: 'Producto(s)', value: selectedPedido.producto },
                  { label: 'Talla(s)', value: selectedPedido.talla || '—' },
                  { label: 'Total pagado', value: `$${Number(selectedPedido.precio).toLocaleString('es-CO')} COP` },
                  { label: 'Método de pago', value: selectedPedido.metodo_pago },
                  { label: 'Fecha de compra', value: selectedPedido.fecha },
                  { label: 'Estado', value: selectedPedido.estado },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(51,65,85,0.5)', paddingBottom: '1rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                    <span style={{ color: '#e2e8f0', fontSize: '0.95rem', textAlign: 'right', maxWidth: '55%' }}>{value}</span>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setSelectedDireccion(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '90%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2.5rem', zIndex: 301 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', color: '#fff', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>Dirección de Envío</h2>
                <button onClick={() => setSelectedDireccion(null)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {[
                  { label: 'Cliente', value: selectedDireccion.cliente },
                  { label: 'País', value: selectedDireccion.pais || 'No registrado' },
                  { label: 'Municipio', value: selectedDireccion.municipio || 'No registrado' },
                  { label: 'Ciudad', value: selectedDireccion.ciudad || 'No registrado' },
                  { label: 'Dirección', value: selectedDireccion.direccion || 'No registrado' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(51,65,85,0.5)', paddingBottom: '1rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                    <span style={{ color: '#e2e8f0', fontSize: '0.95rem', textAlign: 'right', maxWidth: '55%' }}>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .admin-stats-grid {
            grid-template-columns: 1fr !important;
          }
          .admin-table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  );
};

export default Admin;
