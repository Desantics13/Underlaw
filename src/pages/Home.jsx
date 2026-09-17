import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import buddhaModelImg from '../assets/buddha-model.jpg';
import heroRacingImg from '../assets/hero-racing.jpeg';
import heroEstacionImg from '../assets/hero-estacion.jpeg';
import shirtBuddhaImg from '../assets/shirt-buddha.png';
import { API_URL } from '../utils/adminApi';

// Fondo del hero: fotos + posición de encuadre para cada una. Rota cada
// DURACION_HERO ms con fundido cruzado y ligero zoom mientras está activa.
const FONDO_HERO = [
  { src: buddhaModelImg, posicion: 'center 22%' },
  { src: heroRacingImg, posicion: 'center 38%' },
  { src: heroEstacionImg, posicion: 'center 58%' }
];
const DURACION_HERO = 5200;

// Producto de respaldo cuando no hay ningún lanzamiento activo en el backend.
const PRODUCTO_RESPALDO = {
  name: 'Oversized Buddha Tee',
  desc: 'Algodón premium de 240 gsm, corte oversized y estampado propio. Nuestra pieza más pedida, siempre en serie corta.',
  price: '$110.000 COP · 50 unidades',
  image: shirtBuddhaImg
};

const FAQS = [
  { q: '¿Cómo funcionan los drops?', a: 'Cada drop se anuncia con fecha y hora exacta. Te inscribes con tu correo y te avisamos cuando abre la compra. Las unidades son limitadas y no se reponen.' },
  { q: '¿Cuánto tarda el envío?', a: 'Entre 2 y 5 días hábiles a ciudades principales de Colombia. Te enviamos la guía de rastreo por WhatsApp en cuanto el pedido sale.' },
  { q: '¿Qué talla pido?', a: 'El corte es oversized unisex. Si prefieres un calce más ajustado, pide una talla menos de la que usas normalmente.' },
  { q: '¿Cómo cuido la prenda?', a: 'Lavado a mano o en ciclo delicado con agua fría, al revés. Sin secadora ni blanqueador. Plancha por el lado interno para proteger el estampado.' },
  { q: '¿Puedo cambiar o devolver?', a: 'Sí. Tienes 5 días desde que recibes el pedido para solicitar cambio de talla, siempre que la prenda esté sin uso y con su etiqueta.' },
  { q: '¿Qué medios de pago aceptan?', a: 'Tarjeta débito y crédito, PSE y Nequi a través de Wompi. Recibes la factura en PDF por correo al confirmar el pago.' }
];

const WHATSAPP_URL = 'https://api.whatsapp.com/send/?phone=573103184180&text&type=phone_number&app_absent=0';

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

const reveal = (shouldReduceMotion, delay = 0) => ({
  initial: shouldReduceMotion ? false : { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '0px 0px -10% 0px' },
  transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }
});

const Home = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  // ── Rotador de fotos del hero ─────────────────────────────────────────
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setHeroIndex((i) => (i + 1) % FONDO_HERO.length), DURACION_HERO);
    return () => clearInterval(iv);
  }, []);

  // ── Lanzamiento (drop con cuenta regresiva) ──────────────────────────────
  const [drop, setDrop] = useState(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [restante, setRestante] = useState(null);
  const [dropVencido, setDropVencido] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signup, setSignup] = useState({ nombre: '', apellido: '', correo: '', telefono: '' });
  const [signupStatus, setSignupStatus] = useState('idle');
  const [signupError, setSignupError] = useState('');

  // ── FAQ ───────────────────────────────────────────────────────────────
  const [faqAbierta, setFaqAbierta] = useState(-1);

  // Al llegar por un enlace con ancla (#historia, #lanzamiento) desde otra
  // página, hace scroll a la sección una vez montado el home.
  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

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

  const abrirSignup = () => {
    setSignup({ nombre: '', apellido: '', correo: '', telefono: '' });
    setSignupStatus('idle');
    setSignupError('');
    setShowSignup(true);
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignup((prev) => ({ ...prev, [name]: value }));
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

  // Copy y CTA del bloque Lanzamiento según el estado real del drop.
  let lanzamiento;
  if (dropProgramado) {
    lanzamiento = {
      etiqueta: `${drop.nombre_lanzamiento} · Programado`,
      nombre: drop.nombre_producto,
      imagen: drop.imagenes?.[0]?.url,
      texto: 'Serie corta. Inscríbete y te avisamos por correo en el momento exacto en que abre la compra.',
      precio: `$${Number(drop.precio).toLocaleString('es-CO')} COP`,
      badge: drop.nombre_lanzamiento
    };
  } else if (dropLanzado) {
    lanzamiento = {
      etiqueta: `${drop.nombre_lanzamiento} · Ya disponible`,
      nombre: drop.nombre_producto,
      imagen: drop.imagenes?.[0]?.url,
      texto: 'Ya disponible. Series cortas, sin reposición: cuando se agota, no vuelve.',
      precio: `$${Number(drop.precio).toLocaleString('es-CO')} COP`,
      badge: drop.nombre_lanzamiento
    };
  } else {
    lanzamiento = {
      etiqueta: 'Recién llegado',
      nombre: PRODUCTO_RESPALDO.name,
      imagen: PRODUCTO_RESPALDO.image,
      texto: PRODUCTO_RESPALDO.desc,
      precio: PRODUCTO_RESPALDO.price,
      badge: null
    };
  }

  const navCta = dropProgramado
    ? { label: 'Próximo drop', to: '/#lanzamiento' }
    : dropLanzado
      ? { label: 'Comprar ahora', to: drop.producto_id ? `/products?producto=${drop.producto_id}` : '/products' }
      : { label: 'Ver producto', to: '/products' };

  return (
    <div className="home-page">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg">
          {FONDO_HERO.map((foto, i) => (
            <div key={foto.src} className="hero-bg-layer" style={{ opacity: heroIndex === i ? 1 : 0 }}>
              <img
                src={foto.src}
                alt=""
                style={{ objectPosition: foto.posicion, transform: heroIndex === i ? 'scale(1.06)' : 'scale(1)' }}
              />
            </div>
          ))}
          <div className="hero-gradient" />
        </div>

        <div className="hero-dots">
          {FONDO_HERO.map((foto, i) => (
            <button
              key={foto.src}
              type="button"
              aria-label="Ver imagen de fondo"
              className="hero-dot"
              style={{ width: heroIndex === i ? '28px' : '14px', background: heroIndex === i ? 'var(--gold)' : 'rgba(242,240,236,0.35)' }}
              onClick={() => setHeroIndex(i)}
            />
          ))}
        </div>

        <div className="hero-content">
          <motion.p {...reveal(shouldReduceMotion)} className="eyebrow hero-kicker">Legacy of Luxury · Est. MMXXVI</motion.p>
          <motion.h1 {...reveal(shouldReduceMotion, 0.08)} className="hero-title">Underlaw</motion.h1>
          <motion.p {...reveal(shouldReduceMotion, 0.16)} className="hero-subtitle">Under the rules, only yours.</motion.p>
          <motion.div {...reveal(shouldReduceMotion, 0.24)} className="hero-ctas">
            <Link to="/products" className="premium-button">Ver colección</Link>
            <Link to={navCta.to} className="cta-outline">{navCta.label}</Link>
          </motion.div>
        </div>
      </section>

      {/* ── Marquesina ── */}
      <div className="marquee">
        <div className="marquee-track">
          {[0, 1].map((rep) => (
            <div key={rep} className="marquee-set">
              <span>Algodón 240 gsm</span><span className="marquee-dot">·</span>
              <span>Envíos a todo Colombia</span><span className="marquee-dot">·</span>
              <span>Cartagena, CO</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lanzamiento ── */}
      <section id="lanzamiento" className="lanzamiento">
        <div className="container lanzamiento-grid">
          <motion.div {...reveal(shouldReduceMotion)} className="lanzamiento-texto">
            <p className="lanzamiento-etiqueta"><span className="lanzamiento-pulso" />{lanzamiento.etiqueta}</p>
            <h2 className="lanzamiento-nombre">{lanzamiento.nombre}</h2>
            <p className="lanzamiento-desc">{lanzamiento.texto}</p>

            {dropProgramado && (
              <div className="clock">
                {[['Días', t.dias], ['Horas', t.horas], ['Min', t.minutos]].map(([label, val]) => (
                  <div key={label} className="clock-cell">
                    <div className="clock-num tabular">{String(Math.max(0, val)).padStart(2, '0')}</div>
                    <div className="clock-label">{label}</div>
                  </div>
                ))}
                <div className="clock-cell">
                  <div className="clock-num tabular clock-num-gold">{String(Math.max(0, t.segundos)).padStart(2, '0')}</div>
                  <div className="clock-label">Seg</div>
                </div>
              </div>
            )}

            <div className="lanzamiento-cta-row">
              {dropProgramado && (
                <button type="button" className="premium-button" onClick={abrirSignup}>Inscribirme al drop</button>
              )}
              {dropLanzado && (
                <Link to={drop.producto_id ? `/products?producto=${drop.producto_id}` : '/products'} className="premium-button">Comprar ahora</Link>
              )}
              {!dropProgramado && !dropLanzado && (
                <Link to="/products" className="premium-button">Ver producto</Link>
              )}
              <span className="lanzamiento-precio tabular">{lanzamiento.precio}</span>
            </div>
          </motion.div>

          <motion.div {...reveal(shouldReduceMotion, 0.1)} className="lanzamiento-foto">
            <img src={lanzamiento.imagen} alt={lanzamiento.nombre} />
            {lanzamiento.badge && <span className="lanzamiento-badge">{lanzamiento.badge}</span>}
          </motion.div>
        </div>
      </section>

      {/* ── Historia ── */}
      <section id="historia" className="historia">
        <div className="container historia-grid">
          <motion.div {...reveal(shouldReduceMotion)}>
            <p className="eyebrow" style={{ marginBottom: '1.5rem' }}>La marca</p>
            <h2 className="historia-titulo">Pocas piezas.<br />Hechas bien.</h2>
            <p className="historia-texto">UnderLaw nació en Cartagena, Colombia en el 2026 estampando tiradas de 50 camisetas. Seguimos igual: series cortas, telas pesadas y estampados propios. Cuando se agota un drop, no vuelve.</p>
          </motion.div>
          <motion.div {...reveal(shouldReduceMotion, 0.1)} className="historia-tabla">
            {[['Tela', 'Algodón 240 gsm'], ['Corte', 'Oversized unisex'], ['Serie', '50 por drop'], ['Envío', '2 a 5 días hábiles']].map(([k, v]) => (
              <div key={k} className="historia-fila">
                <span className="historia-fila-label">{k}</span>
                <span className="historia-fila-valor">{v}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Preguntas frecuentes ── */}
      <section className="faq">
        <div className="faq-inner">
          <motion.h2 {...reveal(shouldReduceMotion)} className="faq-titulo">Preguntas frecuentes</motion.h2>
          <div className="faq-lista">
            {FAQS.map((f, i) => {
              const abierta = faqAbierta === i;
              return (
                <div key={f.q} className="faq-item">
                  <button type="button" className="faq-pregunta" onClick={() => setFaqAbierta(abierta ? -1 : i)}>
                    <span>{f.q}</span>
                    <span className="faq-icono">{abierta ? '−' : '+'}</span>
                  </button>
                  <div className="faq-respuesta-wrap" style={{ maxHeight: abierta ? '300px' : '0px' }}>
                    <p className="faq-respuesta">{f.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <motion.div {...reveal(shouldReduceMotion)} className="faq-contacto">
            <span>¿Otra duda? Escríbenos por WhatsApp.</span>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="faq-whatsapp">Hablar con la marca</a>
          </motion.div>
        </div>
      </section>

      {/* ── Inscripción al Lanzamiento ── */}
      <AnimatePresence>
        {showSignup && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSignup(false)} className="drawer-scrim" />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="drawer"
            >
              <div className="drawer-head">
                <span className="eyebrow">Expediente — Inscripción</span>
                <button onClick={() => setShowSignup(false)} aria-label="Cerrar"><X size={22} /></button>
              </div>

              {drop && (
                <div className="drawer-item">
                  <img src={drop.imagenes?.[0]?.url} alt={drop.nombre_producto} />
                  <div>
                    <p style={{ fontSize: '0.92rem' }}>{drop.nombre_producto}</p>
                    <p className="tabular" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>${Number(drop.precio).toLocaleString('es-CO')} COP</p>
                  </div>
                </div>
              )}

              {signupStatus === 'done' ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div className="drawer-check">✓</div>
                  <p style={{ color: 'var(--text-tertiary)', lineHeight: 1.75 }}>Listo. Te avisaremos por correo cuando el producto esté disponible.</p>
                  <button onClick={() => setShowSignup(false)} className="premium-button" style={{ marginTop: '2rem', padding: '1rem 2.5rem' }}>Cerrar</button>
                </div>
              ) : (
                <form onSubmit={handleSignupSubmit} className="drawer-form">
                  {[['nombre', 'Nombre', 'text'], ['apellido', 'Apellido', 'text'], ['correo', 'Correo electrónico', 'email'], ['telefono', 'Número de teléfono', 'tel']].map(([n, l, type]) => (
                    <label key={n} className="drawer-field">
                      <span>{l}</span>
                      <input type={type} name={n} required value={signup[n]} onChange={handleSignupChange} />
                    </label>
                  ))}
                  <p className="drawer-error">{signupStatus === 'error' ? signupError : ''}</p>
                  <button type="submit" disabled={signupStatus === 'sending'} className="premium-button" style={{ padding: '1.15rem' }}>
                    {signupStatus === 'sending' ? 'Enviando…' : 'Sellar inscripción'}
                  </button>
                  <p className="drawer-note">Te escribimos solo para avisarte de este drop. Sin listas de correo.</p>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .hero {
          position: relative;
          min-height: min(94vh, 820px);
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .hero-bg { position: absolute; inset: 0; }
        .hero-bg-layer { position: absolute; inset: 0; transition: opacity 1.6s cubic-bezier(.4,0,.2,1); }
        .hero-bg-layer img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          filter: grayscale(.3) contrast(1.08) brightness(.72);
          transition: transform 7s linear;
        }
        .hero-gradient {
          position: absolute; inset: 0;
          background: linear-gradient(to top, var(--bg-primary) 4%, rgba(6,6,6,.82) 38%, rgba(6,6,6,.25) 100%);
        }
        .hero-dots {
          position: absolute; bottom: 1.25rem; right: clamp(1.1rem, 4vw, 2.5rem); z-index: 3;
          display: flex; gap: 0.4rem;
        }
        .hero-dot { height: 2px; border: none; padding: 0; cursor: pointer; transition: all .5s ease; }
        .hero-content {
          position: relative; z-index: 2; width: 100%;
          padding: clamp(2rem, 6vw, 4.5rem) clamp(1.1rem, 4vw, 2.5rem);
          text-align: center;
        }
        .hero-content > * { max-width: 1400px; margin-left: auto; margin-right: auto; }
        .hero-kicker { font-size: 0.66rem; letter-spacing: 0.5em; margin-bottom: clamp(1.25rem, 3vw, 2rem); }
        .hero-title {
          font-weight: 300; font-size: clamp(2.6rem, 10vw, 7rem); line-height: 0.9;
          letter-spacing: 0.12em; text-transform: uppercase; margin: 0;
        }
        .hero-subtitle {
          font-family: var(--font-serif); font-style: italic; font-size: clamp(1.15rem, 3.2vw, 1.9rem);
          color: var(--text-secondary); margin: 1.1rem 0 0;
        }
        .hero-ctas { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; margin-top: clamp(1.75rem, 4vw, 2.75rem); }

        .marquee { border-bottom: 1px solid var(--border); overflow: hidden; padding: 0.85rem 0; }
        .marquee-track { display: flex; width: max-content; animation: ul-marquee 28s linear infinite; }
        .marquee-set {
          display: flex; gap: 2.75rem; padding-right: 2.75rem;
          font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.26em; color: var(--text-muted);
          white-space: nowrap;
        }
        .marquee-dot { color: var(--gold); }
        @keyframes ul-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        .lanzamiento { padding: clamp(3.5rem, 9vw, 7rem) 0; }
        .lanzamiento-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
          gap: clamp(2rem, 5vw, 4.5rem);
          align-items: center;
        }
        .lanzamiento-texto { order: 2; }
        .lanzamiento-etiqueta {
          display: inline-flex; align-items: center; gap: 0.5rem;
          font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.28em; color: var(--gold);
          margin: 0 0 1.25rem;
        }
        .lanzamiento-pulso { width: 6px; height: 6px; border-radius: 50%; background: var(--gold); animation: ul-pulse 1.9s ease-in-out infinite; }
        @keyframes ul-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
        .lanzamiento-nombre { font-weight: 300; font-size: clamp(2.1rem, 6vw, 4rem); line-height: 1.02; letter-spacing: -0.02em; margin: 0 0 1.25rem; }
        .lanzamiento-desc { color: var(--text-tertiary); line-height: 1.8; margin: 0 0 2rem; max-width: 44ch; }
        .clock { display: flex; gap: clamp(1rem, 4vw, 2.25rem); border-top: 1px solid var(--border-soft); border-bottom: 1px solid var(--border-soft); padding: 1.5rem 0; margin-bottom: 2rem; }
        .clock-cell { flex: 1; }
        .clock-num { font-family: var(--font-serif); font-weight: 300; font-size: clamp(2rem, 7vw, 3.2rem); line-height: 1; }
        .clock-num-gold { color: var(--gold); }
        .clock-label { font-size: 0.56rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--text-muted); margin-top: 0.5rem; }
        .lanzamiento-cta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; }
        .lanzamiento-precio { font-size: 0.85rem; color: var(--text-muted); }
        .lanzamiento-foto { order: 1; position: relative; }
        .lanzamiento-foto img { width: 100%; aspect-ratio: 4/5; object-fit: cover; display: block; background: var(--bg-tertiary); }
        .lanzamiento-badge {
          position: absolute; left: 0; bottom: 0; background: var(--bg-primary); border-top: 1px solid var(--gold);
          padding: 0.65rem 0.9rem; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--text-secondary);
        }

        .historia { padding: clamp(3.5rem, 9vw, 7rem) 0; }
        .historia-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
          gap: clamp(2rem, 6vw, 5rem);
          align-items: center;
        }
        .historia-titulo { font-style: italic; font-weight: 300; font-size: clamp(1.9rem, 5.5vw, 3.2rem); line-height: 1.12; margin: 0 0 1.35rem; }
        .historia-texto { color: var(--text-tertiary); line-height: 1.85; margin: 0; max-width: 46ch; }
        .historia-tabla { display: grid; gap: 1px; background: var(--border-soft); }
        .historia-fila { background: var(--bg-primary); padding: 1.35rem 0; display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
        .historia-fila-label { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--text-muted); }
        .historia-fila-valor { font-family: var(--font-serif); font-size: 1.15rem; }

        .faq { background: var(--bg-light); color: var(--text-on-light); padding: clamp(3.5rem, 9vw, 7rem) clamp(1.1rem, 4vw, 2.5rem); }
        .faq-inner { max-width: 940px; margin: 0 auto; }
        .faq-titulo { font-style: italic; font-weight: 300; font-size: clamp(1.9rem, 5.5vw, 3.2rem); margin: 0 0 clamp(1.75rem, 4vw, 2.75rem); color: var(--text-on-light); }
        .faq-lista { display: grid; gap: 1px; background: var(--border-light); }
        .faq-item { background: var(--bg-light); }
        .faq-pregunta {
          width: 100%; background: none; border: none; font-family: inherit; color: var(--text-on-light);
          text-align: left; padding: 1.35rem 0; display: flex; justify-content: space-between; align-items: center;
          gap: 1.5rem; cursor: pointer; font-size: 0.98rem;
        }
        .faq-icono { color: var(--gold); font-size: 1.3rem; line-height: 1; flex-shrink: 0; }
        .faq-respuesta-wrap { overflow: hidden; transition: max-height .5s cubic-bezier(.16,1,.3,1); }
        .faq-respuesta { color: var(--text-on-light-muted); line-height: 1.8; margin: 0; padding: 0 0 1.5rem; max-width: 62ch; }
        .faq-contacto { margin-top: clamp(2rem, 5vw, 3rem); display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; }
        .faq-contacto span { font-size: 0.9rem; color: var(--text-on-light-muted); }
        .faq-whatsapp {
          padding: 0.9rem 1.7rem; background: var(--text-on-light); color: var(--bg-light);
          font-size: 0.66rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.18em;
        }
        .faq-whatsapp:hover { color: var(--bg-light); opacity: 0.85; }

        .drawer-scrim { position: fixed; inset: 0; background: rgba(0,0,0,0.78); z-index: 200; }
        .drawer {
          position: fixed; top: 0; right: 0; width: 100%; max-width: 430px; height: 100%;
          background: var(--bg-secondary); z-index: 201; padding: clamp(1.25rem, 4vw, 2rem);
          border-left: 1px solid var(--border); overflow-y: auto;
        }
        .drawer-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .drawer-head button { color: var(--text-primary); }
        .drawer-item {
          margin-bottom: 2rem; padding-bottom: 1.35rem; border-bottom: 1px solid var(--border);
          display: flex; gap: 1.1rem; align-items: center;
        }
        .drawer-item img { width: 62px; aspect-ratio: 3/4; object-fit: cover; background: var(--bg-tertiary); flex-shrink: 0; }
        .drawer-check {
          width: 58px; height: 58px; border-radius: 50%; border: 1px solid var(--gold);
          display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: var(--gold); font-size: 1.5rem;
        }
        .drawer-form { display: flex; flex-direction: column; gap: 1.35rem; }
        .drawer-field { display: flex; flex-direction: column; gap: 0.5rem; }
        .drawer-field span { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--text-muted); }
        .drawer-field input {
          background: var(--bg-primary); border: 1px solid var(--border-strong);
          color: var(--text-primary); padding: 0.8rem 1rem; font-size: 0.95rem; font-family: var(--font-sans); outline: none;
        }
        .drawer-error { color: var(--error); font-size: 0.85rem; margin: 0; min-height: 1rem; }
        .drawer-note { font-size: 0.78rem; color: var(--text-dim); line-height: 1.7; margin: 0; }

        @media (max-width: 768px) {
          .lanzamiento-texto { order: 2; }
          .lanzamiento-foto { order: 1; }
        }
      `}</style>
    </div>
  );
};

export default Home;
