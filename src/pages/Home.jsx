import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import buddhaModelImg from '../assets/buddha-model.jpg';
import oversizedFirstImg from '../assets/oversized-first.jpg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const featuredProducts = [
  {
    name: "Oversized Buddha Tee",
    desc: "Nuestra pieza insignia. Diseñada para aquellos que viven bajo sus propias reglas. Confeccionada en algodón premium de 240gsm con un corte oversized perfecto.",
    price: "$110.000 COP",
    image: buddhaModelImg
  },
  {
    name: "Oversized First",
    desc: "La primera edición de nuestra colección Legacy of Luxury. Estilo urbano minimalista con un calce perfecto para cualquier ocasión.",
    price: "$110.000 COP",
    image: oversizedFirstImg
  }
];

// Descompone milisegundos restantes en días / horas / minutos / segundos.
const desglosarTiempo = (ms) => {
  const total = Math.max(0, ms);
  const s = Math.floor(total / 1000);
  return {
    dias: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    minutos: Math.floor((s % 3600) / 60),
    segundos: s % 60
  };
};

const Home = () => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [formData, setFormData] = useState({ name: '', lastName: '', phone: '', email: '' });

  const currentProduct = featuredProducts[featuredIndex];

  // ── Lanzamiento (drop con cuenta regresiva) ──────────────────────────────
  const [drop, setDrop] = useState(null);
  // Diferencia entre el reloj del servidor y el del navegador. El cronómetro se
  // calcula contra la hora corregida, no contra el reloj del cliente (que puede
  // estar mal). El disparo real del lanzamiento igual lo valida el servidor.
  const [serverOffset, setServerOffset] = useState(0);
  const [restante, setRestante] = useState(null); // ms hasta el lanzamiento
  const [dropVencido, setDropVencido] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signup, setSignup] = useState({ nombre: '', apellido: '', correo: '', telefono: '' });
  const [signupStatus, setSignupStatus] = useState('idle'); // idle | sending | done | error
  const [signupError, setSignupError] = useState('');

  const fetchDrop = useCallback(() => {
    fetch(`${API_URL}/api/lanzamientos/home`)
      .then((r) => r.json())
      .then(({ lanzamiento, server_now }) => {
        setDrop(lanzamiento || null);
        if (server_now) setServerOffset(Date.parse(server_now) - Date.now());
      })
      .catch((err) => console.error('Error al obtener el lanzamiento del home:', err));
  }, []);

  useEffect(() => { fetchDrop(); }, [fetchDrop]);

  // Cronómetro: tick cada segundo mientras haya un lanzamiento programado.
  useEffect(() => {
    if (!drop || drop.estado !== 'programado') {
      setRestante(null);
      setDropVencido(false);
      return;
    }
    const objetivo = Date.parse(drop.fecha_lanzamiento);
    const tick = () => {
      const rem = objetivo - (Date.now() + serverOffset);
      setRestante(rem);
      if (rem <= 0) setDropVencido(true);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [drop, serverOffset]);

  // Al llegar a cero, el servidor ya habrá creado el producto (scheduler o
  // chequeo perezoso del propio endpoint). Se reconsulta unas cuantas veces
  // hasta que el estado cambie a "lanzado".
  useEffect(() => {
    if (!dropVencido || !drop || drop.estado !== 'programado') return;
    let intentos = 0;
    const iv = setInterval(() => {
      intentos += 1;
      fetchDrop();
      if (intentos >= 8) clearInterval(iv);
    }, 3000);
    return () => clearInterval(iv);
  }, [dropVencido, drop, fetchDrop]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Pedido iniciado. Nos pondremos en contacto contigo.');
    setShowCheckout(false);
  };

  const abrirSignup = () => {
    setSignup({ nombre: '', apellido: '', correo: '', telefono: '' });
    setSignupStatus('idle');
    setSignupError('');
    setShowSignup(true);
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignup(prev => ({ ...prev, [name]: value }));
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!drop) return;
    setSignupStatus('sending');
    setSignupError('');
    try {
      const res = await fetch(`${API_URL}/api/lanzamientos/${drop.id}/inscritos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo completar la inscripción.');
      setSignupStatus('done');
    } catch (error) {
      setSignupStatus('error');
      setSignupError(error.message);
    }
  };

  const dropProgramado = drop && drop.estado === 'programado';
  const dropLanzado = drop && drop.estado === 'lanzado';
  const t = desglosarTiempo(restante ?? 0);

  return (
    <div className="home-page">
      {/* ── Hero ── */}
      <section style={{ height: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', zIndex: 10, padding: '0 1.5rem' }}>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="font-serif italic"
            style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)', marginBottom: '1rem', color: 'var(--text-secondary)' }}
          >
            Legacy Of Luxury
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2 }}
            style={{ fontSize: 'clamp(3.5rem, 14vw, 12rem)', textTransform: 'uppercase', lineHeight: '0.85', margin: '0 0 2rem 0' }}
          >
            UNDERLAW
          </motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }}>
            <Link to="/products" className="premium-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Ver Colección <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,5,5,0.2) 0%, rgba(5,5,5,1) 100%)', zIndex: 2 }} />
      </section>

      {/* ── Sección destacada / Lanzamiento ── */}
      <section className="container" style={{ padding: 'clamp(4rem, 10vw, 10rem) 0' }}>
        <div className="featured-grid">
          {dropProgramado ? (
            <>
              <motion.div key="drop-img" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                <div className="premium-card" style={{ borderRadius: '4px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                  <img src={drop.imagenes?.[0]?.url} alt={drop.nombre_producto} style={{ width: '100%', display: 'block' }} />
                  {/* Cronómetro superpuesto y centrado sobre la imagen */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,5,0.45)', backdropFilter: 'blur(2px)' }}>
                    <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Disponible en</p>
                    <div style={{ display: 'flex', gap: 'clamp(0.75rem, 3vw, 1.75rem)' }}>
                      {[['Días', t.dias], ['Hrs', t.horas], ['Min', t.minutos], ['Seg', t.segundos]].map(([label, val]) => (
                        <div key={label} style={{ textAlign: 'center', minWidth: 'clamp(2.5rem, 9vw, 3.75rem)' }}>
                          <div className="font-serif" style={{ fontSize: 'clamp(1.75rem, 7vw, 3rem)', lineHeight: 1, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                            {String(Math.max(0, val)).padStart(2, '0')}
                          </div>
                          <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div key="drop-txt" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="featured-text">
                <p className="font-serif italic" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{drop.nombre_lanzamiento}</p>
                <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1.5rem', fontSize: 'clamp(2rem, 5vw, 3.5rem)', textAlign: 'left' }}>{drop.nombre_producto}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
                  ${Number(drop.precio).toLocaleString('es-CO')} COP · Inscríbete y te avisamos por correo apenas esté disponible para compra.
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="premium-button" style={{ padding: '1.2rem 2rem', border: '1px solid var(--border)', flex: 1 }} onClick={abrirSignup}>
                    Inscribirme
                  </button>
                </div>
              </motion.div>
            </>
          ) : dropLanzado ? (
            <>
              <motion.div key="launched-img" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                <div className="premium-card" style={{ borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                  <img src={drop.imagenes?.[0]?.url} alt={drop.nombre_producto} style={{ width: '100%', display: 'block' }} />
                </div>
              </motion.div>
              <motion.div key="launched-txt" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="featured-text">
                <p className="font-serif italic" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{drop.nombre_lanzamiento}</p>
                <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1.5rem', fontSize: 'clamp(2rem, 5vw, 3.5rem)', textAlign: 'left' }}>{drop.nombre_producto}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
                  ${Number(drop.precio).toLocaleString('es-CO')} COP · Ya disponible para compra.
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Link
                    to={drop.producto_id ? `/products?producto=${drop.producto_id}` : '/products'}
                    className="premium-button"
                    style={{ padding: '1.2rem 2rem', border: '1px solid var(--border)', flex: 1, textAlign: 'center' }}
                  >
                    Ver Producto
                  </Link>
                </div>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div key={`img-${featuredIndex}`} initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                <div className="premium-card" style={{ borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                  <img src={currentProduct.image} alt={currentProduct.name} style={{ width: '100%', display: 'block' }} />
                </div>
              </motion.div>

              <motion.div key={`txt-${featuredIndex}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="featured-text">
                <p className="font-serif italic" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Recién Llegado</p>
                <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1.5rem', fontSize: 'clamp(2rem, 5vw, 3.5rem)', textAlign: 'left' }}>{currentProduct.name}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>{currentProduct.desc}</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    className="premium-button"
                    style={{ padding: '1.2rem 2rem', border: '1px solid var(--border)', flex: 1 }}
                    onClick={() => setFeaturedIndex((prev) => (prev + 1) % featuredProducts.length)}
                  >
                    Ver Siguiente
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </section>

      {/* ── Inscripción al Lanzamiento ── */}
      <AnimatePresence>
        {showSignup && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSignup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100 }} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '450px', height: '100%', background: 'var(--bg-secondary)', zIndex: 101, padding: '2rem', borderLeft: '1px solid var(--border)', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="font-serif italic" style={{ fontSize: '2rem' }}>Inscribirme</h2>
                <button onClick={() => setShowSignup(false)}><X size={24} /></button>
              </div>

              {drop && (
                <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <img src={drop.imagenes?.[0]?.url} alt={drop.nombre_producto} style={{ width: '60px', height: '80px', objectFit: 'cover' }} />
                  <div>
                    <p style={{ fontSize: '0.9rem' }}>{drop.nombre_producto}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>${Number(drop.precio).toLocaleString('es-CO')} COP</p>
                  </div>
                </div>
              )}

              {signupStatus === 'done' ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <span style={{ fontSize: '1.75rem' }}>✓</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>¡Listo! Te avisaremos por correo cuando el producto esté disponible.</p>
                  <button onClick={() => setShowSignup(false)} className="premium-button" style={{ marginTop: '2rem', padding: '1rem 2.5rem' }}>Cerrar</button>
                </div>
              ) : (
                <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {[['nombre', 'Nombre', 'text'], ['apellido', 'Apellido', 'text'], ['correo', 'Correo Electrónico', 'email'], ['telefono', 'Número de Teléfono', 'tel']].map(([n, l, type]) => (
                    <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{l}</label>
                      <input type={type} name={n} required value={signup[n]} onChange={handleSignupChange} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', padding: '0.5rem 0' }} />
                    </div>
                  ))}
                  {signupStatus === 'error' && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{signupError}</p>}
                  <button type="submit" disabled={signupStatus === 'sending'} className="premium-button" style={{ marginTop: '1rem', padding: '1.2rem', opacity: signupStatus === 'sending' ? 0.6 : 1, cursor: signupStatus === 'sending' ? 'not-allowed' : 'pointer' }}>
                    {signupStatus === 'sending' ? 'Enviando...' : 'Confirmar inscripción'}
                  </button>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Checkout Sidebar ── */}
      <AnimatePresence>
        {showCheckout && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCheckout(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100 }} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '450px', height: '100%', background: 'var(--bg-secondary)', zIndex: 101, padding: '2rem', borderLeft: '1px solid var(--border)', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="font-serif italic" style={{ fontSize: '2rem' }}>Finalizar Compra</h2>
                <button onClick={() => setShowCheckout(false)}><X size={24} /></button>
              </div>
              <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <img src={currentProduct.image} alt={currentProduct.name} style={{ width: '60px', height: '80px', objectFit: 'cover' }} />
                <div>
                  <p style={{ fontSize: '0.9rem' }}>{currentProduct.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{currentProduct.price}</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {[['name','Nombre','text'],['lastName','Apellido','text'],['phone','Teléfono','tel'],['email','Correo Electrónico','email']].map(([n, l, t]) => (
                  <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{l}</label>
                    <input type={t} name={n} required value={formData[n]} onChange={handleInputChange} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', padding: '0.5rem 0' }} />
                  </div>
                ))}
                <button type="submit" className="premium-button" style={{ marginTop: '2rem', padding: '1.2rem' }}>Comprar</button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Brand Ethos ── */}
      <section style={{ backgroundColor: 'var(--bg-secondary)', padding: 'clamp(5rem, 10vw, 10rem) 0' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className="font-serif italic" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', marginBottom: '2rem' }}>"Under the rules, Only Ours."</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Legacy of Luxury since 2026</p>
        </div>
      </section>

      <style>{`
        .featured-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }
        @media (max-width: 768px) {
          .featured-grid {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
          .featured-text {
            text-align: center;
          }
          .featured-text h2 {
            text-align: center !important;
          }
          .featured-text p {
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
