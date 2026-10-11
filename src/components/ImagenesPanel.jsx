import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, ArrowUp, ArrowDown, Image as ImageIcon, RefreshCw, Film } from 'lucide-react';
import { ADMIN_STYLES } from './adminStyles';
import { adminFetch } from '../utils/adminApi';
import { invalidarSitioContenido, extraerIdYoutube, optimizarImagen } from '../utils/sitioContenido';
import buddhaModelImg from '../assets/buddha-model.jpg';
import heroRacingImg from '../assets/hero-racing.webp';
import heroEstacionImg from '../assets/hero-estacion.webp';
import shirtBuddhaImg from '../assets/shirt-buddha.png';

// ─────────────────────────────────────────────────────────────────────────
// Panel "Imágenes": controla las imágenes y videos del sitio público.
// Una tarjeta por zona (ver backend/models/SitioContenido.js). Si una zona
// está vacía, el sitio usa la imagen por defecto que se muestra de referencia.
// ─────────────────────────────────────────────────────────────────────────

const ZONAS = [
  {
    zona: 'home_hero',
    titulo: 'Inicio — carrusel principal',
    donde: 'Fotos de fondo del hero de la página de inicio. Rotan en el orden de esta lista.',
    multiple: true,
    proporcion: '16 / 9',
    respaldo: [
      { src: buddhaModelImg, posicion: 'center 22%' },
      { src: heroRacingImg, posicion: 'center 38%' },
      { src: heroEstacionImg, posicion: 'center 58%' }
    ]
  },
  {
    zona: 'home_producto',
    titulo: 'Inicio — producto destacado',
    donde: 'Imagen del bloque "Recién llegado" del inicio. Cuando hay un lanzamiento activo, la imagen sale de ese lanzamiento (se edita en Lanzamientos).',
    multiple: false,
    proporcion: '4 / 5',
    respaldo: [{ src: shirtBuddhaImg, posicion: 'center center' }]
  },
  {
    zona: 'racing_izquierda',
    titulo: 'Racing — moto izquierda',
    donde: 'Mitad izquierda del hero de /racing; entra desde la izquierda al hacer scroll.',
    multiple: false,
    proporcion: '3 / 4',
    respaldo: [{ src: heroRacingImg, posicion: 'center 68%' }]
  },
  {
    zona: 'racing_derecha',
    titulo: 'Racing — moto derecha',
    donde: 'Mitad derecha del hero de /racing; entra desde la derecha al hacer scroll.',
    multiple: false,
    proporcion: '3 / 4',
    respaldo: [{ src: heroEstacionImg, posicion: 'center 68%' }]
  }
];

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

// "center 22%" -> 22 ; "center top" -> 0 ; "center bottom" -> 100 ; otro -> 50
const posicionAPorcentaje = (posicion) => {
  const m = /(\d{1,3}(?:\.\d+)?)%\s*$/.exec(posicion || '');
  if (m) return Math.min(100, Math.max(0, Math.round(Number(m[1]))));
  if (/\btop\s*$/.test(posicion || '')) return 0;
  if (/\bbottom\s*$/.test(posicion || '')) return 100;
  return 50;
};
const porcentajeAPosicion = (valor) => `center ${valor}%`;

const ImagenesPanel = () => {
  const [data, setData] = useState({ imagenes: {}, videos: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [errores, setErrores] = useState({});
  const [ocupado, setOcupado] = useState('');
  const [encuadres, setEncuadres] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [videoForm, setVideoForm] = useState(null);

  const fileInputRef = useRef(null);
  const pendienteRef = useRef(null);

  const setError = (clave, mensaje) => setErrores((prev) => ({ ...prev, [clave]: mensaje }));

  // Siempre pide la lista fresca (sin caché del navegador): el endpoint público
  // es cacheable 60 s y acá se necesita ver el cambio al instante.
  const recargar = async () => {
    try {
      const res = await adminFetch('/api/sitio', { cache: 'no-store' });
      if (!res.ok) throw new Error('respuesta no válida');
      const d = await res.json();
      setData({ imagenes: d.imagenes || {}, videos: Array.isArray(d.videos) ? d.videos : [] });
      setLoadError('');
    } catch (error) {
      console.error('Error al cargar el contenido del sitio:', error);
      setLoadError('No se pudo cargar el contenido del sitio. Revisa que el backend esté activo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await adminFetch('/api/sitio', { cache: 'no-store' });
        if (!res.ok) throw new Error('respuesta no válida');
        const d = await res.json();
        if (vivo) setData({ imagenes: d.imagenes || {}, videos: Array.isArray(d.videos) ? d.videos : [] });
      } catch (error) {
        console.error('Error al cargar el contenido del sitio:', error);
        if (vivo) setLoadError('No se pudo cargar el contenido del sitio. Revisa que el backend esté activo.');
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  // Tras cualquier cambio guardado: refresca la lista y descarta la caché del
  // sitio público para que Home/Racing vuelvan a pedir el contenido.
  const guardado = async () => {
    invalidarSitioContenido();
    await recargar();
  };

  // ── Imágenes ───────────────────────────────────────────────────────────

  const elegirArchivo = (zona, id = null) => {
    pendienteRef.current = { zona, id };
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const alElegirArchivo = async (e) => {
    const file = e.target.files?.[0];
    const pendiente = pendienteRef.current;
    if (!file || !pendiente) return;
    const { zona, id } = pendiente;

    setError(zona, '');
    if (!TIPOS_PERMITIDOS.includes(file.type)) return setError(zona, 'Solo se permiten imágenes JPG, PNG o WebP.');
    if (file.size > MAX_BYTES) return setError(zona, 'La imagen pesa más de 10 MB.');

    const form = new FormData();
    form.append('imagen', file);
    let ruta = '/api/sitio/imagenes';
    let method = 'POST';
    if (id) {
      ruta = `/api/sitio/imagenes/${id}`;
      method = 'PUT';
    } else {
      form.append('zona', zona);
    }

    setOcupado(`${zona}:${id || 'nueva'}`);
    try {
      const res = await adminFetch(ruta, { method, body: form });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo subir la imagen');
      await guardado();
    } catch (error) {
      setError(zona, error.message);
    } finally {
      setOcupado('');
    }
  };

  const guardarEncuadre = async (img) => {
    const valor = encuadres[img.id];
    if (valor === undefined) return;
    const posicion = porcentajeAPosicion(valor);
    if (posicion === img.posicion) return;

    setError(img.zona, '');
    try {
      const res = await adminFetch(`/api/sitio/imagenes/${img.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posicion })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo guardar el encuadre');
      await guardado();
    } catch (error) {
      setError(img.zona, error.message);
    }
  };

  // Renumera la lista completa (0..n-1) tras mover un elemento: así el orden
  // queda consistente aunque hubiera huecos o valores repetidos.
  const moverElementos = async ({ lista, index, delta, ruta, clave }) => {
    const destino = index + delta;
    if (destino < 0 || destino >= lista.length || ocupado) return;

    const nueva = [...lista];
    [nueva[index], nueva[destino]] = [nueva[destino], nueva[index]];

    setOcupado(`orden:${clave}`);
    setError(clave, '');
    try {
      const resultados = await Promise.all(
        nueva.map((item, i) =>
          item.orden === i
            ? Promise.resolve({ ok: true })
            : adminFetch(`${ruta}/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orden: i })
              })
        )
      );
      if (resultados.some((r) => !r.ok)) throw new Error('No se pudo guardar el nuevo orden');
      await guardado();
    } catch (error) {
      setError(clave, error.message);
    } finally {
      setOcupado('');
    }
  };

  // ── Videos ─────────────────────────────────────────────────────────────

  const abrirVideo = (video = null) => {
    setVideoForm({
      editing: video,
      titulo: video ? video.titulo : '',
      url: video ? video.youtube_url : '',
      error: '',
      saving: false
    });
  };

  const guardarVideo = async (e) => {
    e.preventDefault();
    const f = videoForm;
    if (!f.titulo.trim()) return setVideoForm({ ...f, error: 'El título del video es requerido.' });
    if (!extraerIdYoutube(f.url)) {
      return setVideoForm({ ...f, error: 'El link no es de YouTube. Usa un link tipo youtube.com/watch?v=…, youtu.be/…, /shorts/… o /live/…' });
    }

    setVideoForm({ ...f, error: '', saving: true });
    try {
      const res = await adminFetch(f.editing ? `/api/sitio/videos/${f.editing.id}` : '/api/sitio/videos', {
        method: f.editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: f.titulo.trim(), youtube_url: f.url.trim() })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo guardar el video');
      await guardado();
      setVideoForm(null);
    } catch (error) {
      setVideoForm({ ...f, error: error.message, saving: false });
    }
  };

  // ── Eliminar (imagen o video) ──────────────────────────────────────────

  const confirmarEliminar = async () => {
    if (!deleteTarget) return;
    const { tipo, item } = deleteTarget;
    const clave = tipo === 'video' ? 'videos' : item.zona;

    setDeleting(true);
    try {
      const res = await adminFetch(`/api/sitio/${tipo === 'video' ? 'videos' : 'imagenes'}/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'No se pudo eliminar');
      }
      await guardado();
      setDeleteTarget(null);
    } catch (error) {
      setError(clave, error.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const ocupadoEn = (prefijo) => ocupado.startsWith(prefijo);

  // ── Render ─────────────────────────────────────────────────────────────

  const renderImagen = (z, img, index, lista) => {
    const valor = encuadres[img.id] !== undefined ? encuadres[img.id] : posicionAPorcentaje(img.posicion);
    const bloqueado = !!ocupado;
    return (
      <div key={img.id} className="img-tile">
        <div className="img-thumb" style={{ aspectRatio: z.proporcion }}>
          <img src={optimizarImagen(img.url, 700)} alt={img.alt || ''} style={{ objectPosition: porcentajeAPosicion(valor) }} />
          {ocupadoEn(`${z.zona}:${img.id}`) && <span className="img-thumb-ocupado">Subiendo…</span>}
        </div>

        <label className="img-encuadre">
          <span>Encuadre vertical · {valor}%</span>
          <input
            type="range" min="0" max="100" step="1" value={valor}
            onChange={(e) => setEncuadres((prev) => ({ ...prev, [img.id]: Number(e.target.value) }))}
            onPointerUp={() => guardarEncuadre(img)}
            onKeyUp={() => guardarEncuadre(img)}
            onBlur={() => guardarEncuadre(img)}
            disabled={bloqueado}
          />
        </label>

        <div className="img-actions">
          {z.multiple && (
            <span className="img-orden">
              <button type="button" onClick={() => moverElementos({ lista, index, delta: -1, ruta: '/api/sitio/imagenes', clave: z.zona })} disabled={index === 0 || bloqueado} aria-label="Subir">
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => moverElementos({ lista, index, delta: 1, ruta: '/api/sitio/imagenes', clave: z.zona })} disabled={index === lista.length - 1 || bloqueado} aria-label="Bajar">
                <ArrowDown size={14} />
              </button>
            </span>
          )}
          <button type="button" onClick={() => elegirArchivo(z.zona, img.id)} disabled={bloqueado} className="admin-link-gold-plain">
            <RefreshCw size={14} /> Reemplazar
          </button>
          <button type="button" onClick={() => setDeleteTarget({ tipo: 'imagen', item: { ...img, zona: z.zona } })} disabled={bloqueado} className="admin-link-error">
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      </div>
    );
  };

  const renderZona = (z) => {
    const imagenes = data.imagenes[z.zona] || [];
    const vacia = imagenes.length === 0;
    const bloqueado = !!ocupado;

    return (
      <section key={z.zona} className="img-zona">
        <div className="img-zona-head">
          <div>
            <h2 className="img-zona-titulo">{z.titulo}</h2>
            <p className="img-zona-donde">{z.donde}</p>
          </div>
          {(z.multiple || vacia) && (
            <button type="button" onClick={() => elegirArchivo(z.zona)} disabled={bloqueado} className="admin-btn-create" style={{ opacity: bloqueado ? 0.6 : 1 }}>
              <Plus size={15} /> {z.multiple ? 'Agregar imagen' : 'Subir imagen'}
            </button>
          )}
        </div>

        {errores[z.zona] && <p className="admin-error img-zona-error">{errores[z.zona]}</p>}

        {vacia ? (
          <div className="img-vacia">
            <p className="img-vacia-texto">
              <ImageIcon size={15} /> Usando la imagen por defecto del sitio
            </p>
            <div className="img-grid">
              {z.respaldo.map((r, i) => (
                <div key={i} className="img-tile">
                  <div className="img-thumb" style={{ aspectRatio: z.proporcion }}>
                    <img src={r.src} alt="" style={{ objectPosition: r.posicion }} />
                    <span className="img-badge">Por defecto</span>
                    {ocupadoEn(`${z.zona}:nueva`) && <span className="img-thumb-ocupado">Subiendo…</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="img-grid">
            {imagenes.map((img, i) => renderImagen(z, img, i, imagenes))}
            {ocupadoEn(`${z.zona}:nueva`) && (
              <div className="img-tile">
                <div className="img-thumb" style={{ aspectRatio: z.proporcion }}>
                  <span className="img-thumb-ocupado">Subiendo…</span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  const videos = data.videos;
  const idPrevisualizacion = videoForm ? extraerIdYoutube(videoForm.url) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="admin-content-head">
        <div>
          <h1 className="admin-content-title">Imágenes y videos del sitio</h1>
          <p className="admin-content-sub">
            Controla las fotos del inicio y de Racing. Si una zona está vacía, el sitio usa su imagen por defecto. Los cambios se ven en el sitio en menos de un minuto.
          </p>
        </div>
      </div>

      {loadError && <p className="admin-error" style={{ marginBottom: '1.5rem' }}>{loadError}</p>}

      {loading ? (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '3rem 0' }}>Cargando imágenes...</p>
      ) : (
        <>
          {ZONAS.map(renderZona)}

          {/* ── Videos de Racing ── */}
          <section className="img-zona">
            <div className="img-zona-head">
              <div>
                <h2 className="img-zona-titulo">Racing — videos</h2>
                <p className="img-zona-donde">Carrusel de videos de YouTube al final de /racing, en el orden de esta lista. Si no hay ninguno, el sitio usa el video por defecto.</p>
              </div>
              <button type="button" onClick={() => abrirVideo()} disabled={!!ocupado} className="admin-btn-create">
                <Plus size={15} /> Agregar video
              </button>
            </div>

            {errores.videos && <p className="admin-error img-zona-error">{errores.videos}</p>}

            {videos.length === 0 ? (
              <div className="img-vacia">
                <p className="img-vacia-texto"><Film size={15} /> Usando el video por defecto del sitio</p>
              </div>
            ) : (
              <div className="admin-list">
                {videos.map((v, i) => {
                  const id = extraerIdYoutube(v.youtube_url);
                  return (
                    <div key={v.id} className="admin-list-row">
                      <span className="img-orden">
                        <button type="button" onClick={() => moverElementos({ lista: videos, index: i, delta: -1, ruta: '/api/sitio/videos', clave: 'videos' })} disabled={i === 0 || !!ocupado} aria-label="Subir">
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" onClick={() => moverElementos({ lista: videos, index: i, delta: 1, ruta: '/api/sitio/videos', clave: 'videos' })} disabled={i === videos.length - 1 || !!ocupado} aria-label="Bajar">
                          <ArrowDown size={14} />
                        </button>
                      </span>
                      {id && <img className="img-video-thumb" src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt="" loading="lazy" />}
                      <span style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: '1.15rem' }}>{v.titulo}</span>
                        <a href={v.youtube_url} target="_blank" rel="noreferrer" className="img-video-link">{v.youtube_url}</a>
                      </span>
                      <span style={{ flex: '0 0 auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button type="button" onClick={() => abrirVideo(v)} disabled={!!ocupado} className="admin-link-gold-plain">
                          <Pencil size={14} /> Editar
                        </button>
                        <button type="button" onClick={() => setDeleteTarget({ tipo: 'video', item: v })} disabled={!!ocupado} className="admin-link-error">
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={alElegirArchivo}
        style={{ display: 'none' }}
      />

      {/* Modal Agregar/Editar video */}
      <AnimatePresence>
        {videoForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => !videoForm.saving && setVideoForm(null)}
            className="admin-modal-overlay"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="admin-modal"
              style={{ maxWidth: '480px' }}
            >
              <div className="admin-modal-head">
                <h2 className="admin-modal-title">{videoForm.editing ? 'Editar video' : 'Agregar video'}</h2>
                <button onClick={() => !videoForm.saving && setVideoForm(null)} className="admin-modal-close" aria-label="Cerrar"><X size={22} /></button>
              </div>

              <form onSubmit={guardarVideo} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <label className="admin-field">
                  <span>Título</span>
                  <input type="text" placeholder="Ej: Rodada nocturna" value={videoForm.titulo} maxLength={150}
                    onChange={(e) => setVideoForm({ ...videoForm, titulo: e.target.value })} autoFocus />
                </label>
                <label className="admin-field">
                  <span>Link de YouTube</span>
                  <input type="text" placeholder="https://www.youtube.com/watch?v=…" value={videoForm.url}
                    onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value, error: '' })} />
                </label>

                {idPrevisualizacion && (
                  <img className="img-video-previa" src={`https://img.youtube.com/vi/${idPrevisualizacion}/mqdefault.jpg`} alt="Carátula del video" />
                )}

                {videoForm.error && <p className="admin-error">{videoForm.error}</p>}

                <button type="submit" disabled={videoForm.saving} className="premium-button"
                  style={{ marginTop: '0.5rem', opacity: videoForm.saving ? 0.6 : 1, cursor: videoForm.saving ? 'not-allowed' : 'pointer' }}>
                  {videoForm.saving ? 'Guardando…' : videoForm.editing ? 'Guardar cambios' : 'Agregar video'}
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
              <h3 className="admin-confirm-title">
                {deleteTarget.tipo === 'video' ? '¿Eliminar este video?' : '¿Eliminar esta imagen?'}
              </h3>
              <p className="admin-confirm-text">
                {deleteTarget.tipo === 'video'
                  ? `"${deleteTarget.item.titulo}" dejará de aparecer en Racing.`
                  : 'La imagen se borrará del sitio y de Cloudinary. Si la zona queda vacía, se usará la imagen por defecto.'}
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

      <style>{ADMIN_STYLES}{`
        .img-zona { border: 1px solid var(--border); background: var(--bg-secondary); margin-bottom: 1.5rem; }
        .img-zona-head {
          padding: 1.25rem clamp(1.1rem, 3vw, 1.75rem); border-bottom: 1px solid var(--border);
          display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start; justify-content: space-between;
        }
        .img-zona-titulo { font-family: var(--font-serif); font-size: 1.35rem; margin: 0 0 0.35rem; }
        .img-zona-donde { margin: 0; color: var(--text-tertiary); font-size: 0.85rem; line-height: 1.6; max-width: 64ch; }
        .img-zona-error { margin: 0; padding: 0.9rem clamp(1.1rem, 3vw, 1.75rem); border-bottom: 1px solid var(--border); }

        .img-vacia { padding: 1.25rem clamp(1.1rem, 3vw, 1.75rem) 1.5rem; }
        .img-vacia-texto { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; color: var(--text-muted); font-size: 0.85rem; }

        .img-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 1rem;
          padding: 1.25rem clamp(1.1rem, 3vw, 1.75rem);
        }
        .img-vacia .img-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 240px)); padding: 0; }
        .img-tile {
          background: var(--bg-primary); border: 1px solid var(--border); padding: 0.85rem;
          display: flex; flex-direction: column; gap: 0.85rem; align-content: start;
        }
        .img-thumb { position: relative; width: 100%; background: #000; overflow: hidden; border: 1px solid var(--border); }
        .img-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .img-badge {
          position: absolute; left: 0.5rem; top: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(6,6,6,0.75);
          border: 1px solid var(--border-strong); font-size: 0.56rem; text-transform: uppercase; letter-spacing: 0.16em;
          color: var(--text-secondary);
        }
        .img-thumb-ocupado {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          background: rgba(6,6,6,0.7); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--gold);
        }

        .img-encuadre { display: flex; flex-direction: column; gap: 0.4rem; }
        .img-encuadre span { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.16em; color: var(--text-muted); }
        .img-encuadre input[type=range] { width: 100%; accent-color: var(--gold); }

        .img-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.9rem; }
        .img-orden { display: flex; flex-direction: column; flex-shrink: 0; }
        .img-actions .img-orden { flex-direction: row; }
        .img-orden button {
          background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: flex;
        }
        .img-orden button:disabled { color: var(--border-strong); cursor: not-allowed; }

        .img-video-thumb { width: 96px; height: 54px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
        .img-video-link { display: block; margin-top: 0.25rem; font-size: 0.75rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .img-video-previa { width: 100%; max-width: 280px; aspect-ratio: 16 / 9; object-fit: cover; border: 1px solid var(--border); }
      `}</style>
    </motion.div>
  );
};

export default ImagenesPanel;
