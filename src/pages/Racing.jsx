import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import wordmark from '../assets/underlaw-racing-wordmark.png';
import fotoIzquierdaDefault from '../assets/hero-racing.webp';
import fotoDerechaDefault from '../assets/hero-estacion.webp';
import { useSitioContenido, optimizarImagen, extraerIdYoutube } from '../utils/sitioContenido';

// ─────────────────────────────────────────────────────────────────────────
// CONTENIDO EDITABLE
//
// Las fotos del hero y los videos se administran desde el Admin (pestaña
// "Imágenes"). Lo de abajo es el RESPALDO que se usa mientras esa pestaña no
// tenga nada cargado (o si el backend no responde).
// ─────────────────────────────────────────────────────────────────────────

// Video de respaldo (watch?v=…, youtu.be/…, shorts/…). Solo se usa si el Admin
// no tiene ningún video; si además está vacío, se muestra "Próximamente".
const VIDEO_YOUTUBE_URL = 'https://www.youtube.com/watch?v=VYPbu48X3GY';
const TITULO_VIDEO_RESPALDO = 'Avance Underlaw Racing';

// Para cambiar las fotos del hero sin tocar código: guarda tus archivos en
// src/assets/racing/ con los nombres moto-izquierda.(jpg|jpeg|png|webp) y
// moto-derecha.(jpg|jpeg|png|webp). Si no existen, se usan las de respaldo.
const fotosPersonalizadas = import.meta.glob('../assets/racing/moto-*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default'
});
const buscarFoto = (nombre) =>
  Object.entries(fotosPersonalizadas).find(([ruta]) => ruta.includes(`/${nombre}.`))?.[1];

const FOTO_IZQUIERDA = buscarFoto('moto-izquierda') || fotoIzquierdaDefault;
const FOTO_DERECHA = buscarFoto('moto-derecha') || fotoDerechaDefault;

const PILARES = [
  { titulo: 'Hecho para rodar', texto: 'Prendas pensadas para quienes viven sobre dos ruedas: cómodas en la moto y firmes en la calle.' },
  { titulo: 'Series cortas', texto: 'Igual que el resto de Underlaw: tiradas limitadas, sin reposición. Cuando se agota, no vuelve.' },
  { titulo: 'La calle es la pista', texto: 'Fotografiamos cada pieza donde nace: estaciones, parqueaderos y noche en Cartagena.' }
];

const reveal = (reducido, delay = 0) => ({
  initial: reducido ? false : { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '0px 0px -10% 0px' },
  transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }
});

// ── Video de YouTube: carátula liviana; el iframe solo carga al darle play ──
// El carrusel lo monta con key={video.id}: al cambiar de video se desmonta y
// el iframe anterior se descarga.
const VideoAvance = ({ url, titulo }) => {
  const [reproduciendo, setReproduciendo] = useState(false);
  const id = extraerIdYoutube(url);

  if (!id) {
    return (
      <div className="racing-video-box racing-video-vacio">
        <span className="eyebrow">Próximamente</span>
        <p>El video del avance estará aquí muy pronto.</p>
      </div>
    );
  }

  return (
    <div className="racing-video-box">
      {reproduciendo ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={titulo || TITULO_VIDEO_RESPALDO}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="racing-video-play"
          onClick={() => setReproduciendo(true)}
          aria-label={`Reproducir video: ${titulo || TITULO_VIDEO_RESPALDO}`}
        >
          <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="racing-video-icono"><Play size={26} fill="currentColor" /></span>
        </button>
      )}
    </div>
  );
};

// ── Carrusel de videos: título arriba, flechas (botones y teclado) y contador ──
const VideosCarrusel = ({ videos }) => {
  const [indice, setIndice] = useState(0);
  const total = videos.length;

  if (total === 0) {
    return <VideoAvance url="" />;
  }

  const actual = videos[indice % total];
  const ir = (delta) => setIndice((i) => (i + delta + total) % total);

  const alTeclado = (e) => {
    if (total < 2) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      ir(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      ir(1);
    }
  };

  return (
    <div
      className="racing-carrusel"
      role="group"
      aria-roledescription="carrusel"
      aria-label="Videos de Underlaw Racing"
      tabIndex={total > 1 ? 0 : undefined}
      onKeyDown={alTeclado}
    >
      <p className="racing-carrusel-titulo" aria-live="polite">{actual.titulo}</p>

      <div className="racing-carrusel-marco">
        {total > 1 && (
          <button type="button" className="racing-carrusel-flecha" onClick={() => ir(-1)} aria-label="Video anterior">
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="racing-carrusel-video">
          <VideoAvance key={actual.id} url={actual.youtube_url} titulo={actual.titulo} />
        </div>
        {total > 1 && (
          <button type="button" className="racing-carrusel-flecha" onClick={() => ir(1)} aria-label="Video siguiente">
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {total > 1 && <p className="racing-carrusel-contador tabular">{(indice % total) + 1} / {total}</p>}
    </div>
  );
};

const Racing = () => {
  const reducido = useReducedMotion();
  const trackRef = useRef(null);

  // Contenido del Admin (pestaña Imágenes). Cada zona cae al respaldo del
  // código si viene vacía. Hasta que responde el backend no se pinta ninguna
  // foto, para no mostrar un destello de la imagen equivocada.
  const { imagenes: sitioImagenes, videos: sitioVideos, listo: sitioListo } = useSitioContenido();
  const fotoDe = (zona, respaldo, altRespaldo) => {
    if (!sitioListo) return null;
    const subida = sitioImagenes[zona]?.[0];
    if (subida) {
      return { src: optimizarImagen(subida.url), posicion: subida.posicion, alt: subida.alt || altRespaldo };
    }
    return { src: respaldo, posicion: undefined, alt: altRespaldo };
  };
  const fotoIzq = fotoDe('racing_izquierda', FOTO_IZQUIERDA, 'Dos motos de Underlaw Racing en una noche lluviosa');
  const fotoDer = fotoDe('racing_derecha', FOTO_DERECHA, 'Motos de Underlaw Racing en una estación de servicio');

  // Videos: los del Admin; si no hay ninguno, el de respaldo (si lo hay).
  const videos = sitioVideos.length > 0
    ? sitioVideos
    : VIDEO_YOUTUBE_URL
      ? [{ id: 'respaldo', titulo: TITULO_VIDEO_RESPALDO, youtube_url: VIDEO_YOUTUBE_URL }]
      : [];

  // Progreso 0→1 mientras el hero "pegajoso" recorre su pista de scroll.
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });

  // Con movimiento reducido, todo queda directamente en su estado final.
  const r = (de, a) => (reducido ? [a, a] : de);
  const xIzq = useTransform(scrollYProgress, [0, 0.7], r(['-62%', '0%'], ['0%', '0%']));
  const xDer = useTransform(scrollYProgress, [0, 0.7], r(['62%', '0%'], ['0%', '0%']));
  const zoom = useTransform(scrollYProgress, [0, 0.7], r([1.25, 1], [1, 1]));
  const opSombra = useTransform(scrollYProgress, [0, 0.7], r([0.65, 0.15], [0.15, 0.15]));
  const costura = useTransform(scrollYProgress, [0.55, 0.8], r([0, 1], [1, 1]));
  const opTitulo = useTransform(scrollYProgress, [0.6, 0.85], r([0, 1], [1, 1]));
  const yTitulo = useTransform(scrollYProgress, [0.6, 0.85], r([24, 0], [0, 0]));
  const opPista = useTransform(scrollYProgress, [0, 0.12], r([1, 0], [0, 0]));

  return (
    <div className="racing-page">
      {/* ── Hero: dos motos que se encuentran con el scroll ── */}
      <section ref={trackRef} className={`racing-track${reducido ? ' is-static' : ''}`} aria-label="Underlaw Racing">
        <div className="racing-stage">
          <div className="racing-halves">
            <div className="racing-half">
              <motion.div className="racing-photo" style={{ x: xIzq }}>
                {fotoIzq && (
                  <motion.img src={fotoIzq.src} alt={fotoIzq.alt} style={{ scale: zoom, objectPosition: fotoIzq.posicion }} />
                )}
                <motion.div className="racing-shade" style={{ '--o': opSombra }} />
              </motion.div>
            </div>
            <div className="racing-half">
              <motion.div className="racing-photo" style={{ x: xDer }}>
                {fotoDer && (
                  <motion.img src={fotoDer.src} alt={fotoDer.alt} style={{ scale: zoom, objectPosition: fotoDer.posicion }} />
                )}
                <motion.div className="racing-shade" style={{ '--o': opSombra }} />
              </motion.div>
            </div>
          </div>

          <motion.span className="racing-seam" style={{ '--o': costura }} aria-hidden="true" />

          <motion.div className="racing-titulo" style={{ '--o': opTitulo, y: yTitulo }}>
            <p className="eyebrow racing-kicker">Underlaw presenta</p>
            <h1><img src={wordmark} alt="UnderlawRacing" className="racing-wordmark" /></h1>
          </motion.div>

          <motion.div className="racing-pista" style={{ '--o': opPista }} aria-hidden="true">
            <span>Desliza</span>
            <i />
          </motion.div>
        </div>
      </section>

      {/* ── Qué es ── */}
      <section className="racing-info">
        <div className="container">
          <motion.div {...reveal(reducido)} className="racing-info-cabeza">
            <p className="eyebrow">La sección</p>
            <h2>Underlaw sobre dos ruedas.</h2>
            <p className="racing-info-texto">
              Underlaw Racing es el lado motero de la marca: la misma ropa de series cortas y telas pesadas,
              llevada a la cultura de las motos, las rodadas nocturnas y la calle.
            </p>
          </motion.div>

          <div className="racing-pilares">
            {PILARES.map((p, i) => (
              <motion.div key={p.titulo} {...reveal(reducido, i * 0.08)} className="racing-pilar">
                <span className="racing-pilar-num tabular">{String(i + 1).padStart(2, '0')}</span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Video ── */}
      <section className="racing-video">
        <div className="container racing-video-inner">
          <motion.div {...reveal(reducido)} className="racing-video-cabeza">
            <p className="eyebrow">El avance</p>
            <h2>Mira cómo va el proyecto.</h2>
          </motion.div>
          <motion.div {...reveal(reducido, 0.1)} className="racing-video-marco">
            <VideosCarrusel videos={videos} />
          </motion.div>
          <motion.div {...reveal(reducido, 0.15)} className="racing-cta">
            <Link to="/products" className="premium-button">Ver colección</Link>
            <Link to="/" className="cta-outline">Volver a Underlaw</Link>
          </motion.div>
        </div>
      </section>

      <style>{`
        .racing-page { background: var(--bg-primary); }

        /* Pista de scroll: da el recorrido para animar; el escenario queda fijo. */
        .racing-track { position: relative; height: 260vh; }
        .racing-track.is-static { height: auto; }
        .racing-stage {
          position: sticky; top: 68px;
          height: calc(100vh - 68px); height: calc(100svh - 68px);
          overflow: hidden; background: var(--bg-primary);
        }
        .racing-track.is-static .racing-stage { position: relative; }

        .racing-halves { position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 1fr; }
        .racing-half { position: relative; overflow: hidden; }
        .racing-photo { position: absolute; inset: 0; will-change: transform; }
        .racing-photo img {
          width: 100%; height: 100%; object-fit: cover; object-position: center 68%; display: block;
          filter: contrast(1.06) saturate(.95); will-change: transform;
        }
        .racing-shade { position: absolute; inset: 0; background: #000; pointer-events: none; opacity: var(--o, 0.65); }

        /* Línea dorada que aparece cuando las dos fotos se unen */
        .racing-seam {
          position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; margin-left: -0.5px;
          background: linear-gradient(to bottom, transparent, var(--gold) 20%, var(--gold) 80%, transparent);
          pointer-events: none; opacity: var(--o, 0);
        }

        /* Centrado con flex (no con transform: Framer lo usa para la animación).
           El padding inferior sube el título un poco por encima del centro. */
        .racing-titulo {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 0 1.1rem 14vh;
          text-align: center; pointer-events: none; opacity: var(--o, 0);
          text-shadow: 0 2px 40px rgba(0,0,0,.75);
        }
        .racing-kicker { letter-spacing: 0.5em; margin-bottom: 1.1rem; font-size: 0.66rem; }
        .racing-titulo h1 { margin: 0; line-height: 0; }
        .racing-wordmark { width: min(86vw, 640px); height: auto; display: inline-block; }

        .racing-pista {
          position: absolute; left: 0; right: 0; bottom: 1.5rem; display: flex; flex-direction: column;
          align-items: center; gap: 0.6rem; pointer-events: none; opacity: var(--o, 1);
          font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.3em; color: var(--text-secondary);
        }
        .racing-pista i {
          width: 1px; height: 34px; background: var(--gold); transform-origin: top;
          animation: racing-pista 1.8s ease-in-out infinite;
        }
        @keyframes racing-pista { 0% { transform: scaleY(0); } 60% { transform: scaleY(1); } 100% { transform: scaleY(1); opacity: 0; } }

        /* En móvil las mitades se apilan: arriba entra desde la izquierda, abajo desde la derecha */
        @media (max-width: 720px) {
          .racing-halves { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
          .racing-seam { left: 0; right: 0; top: 50%; bottom: auto; width: auto; height: 1px; margin: -0.5px 0 0;
            background: linear-gradient(to right, transparent, var(--gold) 20%, var(--gold) 80%, transparent);
            }
        }

        .racing-info { padding: clamp(3.5rem, 9vw, 7rem) 0; border-top: 1px solid var(--border); }
        .racing-info-cabeza { max-width: 640px; margin-bottom: clamp(2.25rem, 6vw, 4rem); }
        .racing-info-cabeza .eyebrow { margin-bottom: 1.25rem; }
        .racing-info-cabeza h2, .racing-video-cabeza h2 {
          font-weight: 300; font-size: clamp(1.9rem, 5.5vw, 3.2rem); line-height: 1.1; font-style: italic; margin: 0 0 1.25rem;
        }
        .racing-info-texto { color: var(--text-tertiary); line-height: 1.85; margin: 0; }
        .racing-pilares {
          display: grid; grid-template-columns: 1fr; gap: 1px; background: var(--border-soft);
        }
        .racing-pilar { background: var(--bg-primary); padding: 1.75rem 0; }
        @media (min-width: 900px) {
          .racing-pilares { grid-template-columns: repeat(3, 1fr); }
          .racing-pilar { padding: clamp(2.25rem, 4vw, 3.25rem) clamp(1.75rem, 3vw, 2.75rem); text-align: center; }
          .racing-pilares .racing-pilar p { margin-left: auto; margin-right: auto; max-width: 30ch; }
        }
        .racing-pilar-num { font-size: 0.66rem; letter-spacing: 0.2em; color: var(--gold); }
        .racing-pilar h3 { font-size: 1.5rem; margin: 0.9rem 0 0.7rem; }
        .racing-pilar p { color: var(--text-tertiary); line-height: 1.75; margin: 0; font-size: 0.95rem; }

        .racing-video { padding: clamp(3.5rem, 9vw, 7rem) 0; background: var(--bg-secondary); border-top: 1px solid var(--border); }
        .racing-video-inner { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .racing-video-cabeza .eyebrow { margin-bottom: 1.1rem; }
        .racing-video-marco { width: 100%; max-width: 860px; }

        /* Carrusel de videos: título arriba, flechas a los lados y contador abajo */
        .racing-carrusel { width: 100%; outline: none; }
        .racing-carrusel:focus-visible { outline: 1px solid var(--gold); outline-offset: 6px; }
        .racing-carrusel-titulo {
          font-family: var(--font-serif); font-size: clamp(1.15rem, 3.4vw, 1.55rem); font-style: italic;
          margin: 0 0 1rem; min-height: 1.4em;
        }
        .racing-carrusel-marco { display: flex; align-items: center; gap: clamp(0.4rem, 1.5vw, 1rem); }
        .racing-carrusel-video { flex: 1 1 auto; min-width: 0; }
        .racing-carrusel-flecha {
          flex: 0 0 auto; width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; padding: 0;
          background: transparent; border: 1px solid var(--border-strong); color: var(--text-primary);
          cursor: pointer; transition: var(--transition);
        }
        .racing-carrusel-flecha:hover { border-color: var(--gold); color: var(--gold); }
        .racing-carrusel-contador {
          margin: 1rem 0 0; font-size: 0.66rem; letter-spacing: 0.24em; color: var(--text-muted);
        }
        @media (max-width: 480px) {
          .racing-carrusel-flecha { width: 36px; height: 36px; }
        }
        .racing-video-box {
          position: relative; width: 100%; aspect-ratio: 16 / 9; background: var(--bg-tertiary);
          border: 1px solid var(--border-strong); overflow: hidden;
        }
        .racing-video-box iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .racing-video-play { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; display: block; }
        .racing-video-play img { width: 100%; height: 100%; object-fit: cover; display: block; filter: brightness(.7); }
        .racing-video-play:hover img { filter: brightness(.85); }
        .racing-video-icono {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          width: 68px; height: 68px; border-radius: 50%; border: 1px solid var(--gold);
          background: rgba(6,6,6,.65); color: var(--text-primary);
          display: flex; align-items: center; justify-content: center; padding-left: 4px;
        }
        .racing-video-vacio {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.9rem; padding: 1.5rem;
        }
        .racing-video-vacio p { color: var(--text-tertiary); font-size: 0.95rem; margin: 0; }
        .racing-cta { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; margin-top: clamp(2rem, 5vw, 3rem); }
      `}</style>
    </div>
  );
};

export default Racing;
