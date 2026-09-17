import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Plus, Minus } from 'lucide-react';
import { jsPDF } from "jspdf";
import ProductImageCarousel from '../components/ProductImageCarousel';
import QuickViewModal from '../components/QuickViewModal';
import { API_URL } from '../utils/adminApi';

const WOMPI_WIDGET_SCRIPT_ID = 'wompi-widget-script';

// "Camisetas Oversized" -> "camisetas-oversized" (para el filtro ?seccion=... en la URL)
const ACENTOS = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };
const slugify = (str) =>
  String(str || '')
    .toLowerCase()
    .split('').map((ch) => ACENTOS[ch] || ch).join('')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const Products = () => {
  const [productsList, setProductsList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [secciones, setSecciones] = useState([]);
  const [seccionActiva, setSeccionActiva] = useState(() => new URLSearchParams(window.location.search).get('seccion') || null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  // Deep-link ?producto=<id> (lo usa el correo de lanzamiento): abre la vista
  // rápida de ese producto en cuanto el catálogo carga.
  const [deepLinkProductId, setDeepLinkProductId] = useState(() => {
    const raw = new URLSearchParams(window.location.search).get('producto');
    return raw && /^\d+$/.test(raw) ? Number(raw) : null;
  });
  const [checkoutStep, setCheckoutStep] = useState('cart'); // cart, info, address, payment, declined, success
  const [formData, setFormData] = useState({ name: '', lastName: '', phone: '', email: '', doc: '', pais: '', municipio: '', ciudad: '', direccion: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [declineStatus, setDeclineStatus] = useState('');

  // Carga el script del Widget de Wompi una sola vez
  useEffect(() => {
    if (document.getElementById(WOMPI_WIDGET_SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = WOMPI_WIDGET_SCRIPT_ID;
    script.src = 'https://checkout.wompi.co/widget.js';
    document.body.appendChild(script);
  }, []);

  // Carga el catálogo real desde el backend (gestionado en el panel "Productos" del Admin)
  useEffect(() => {
    fetch(`${API_URL}/api/catalogo`)
      .then(res => res.json())
      .then(data => {
        const formatted = data.map(p => ({
          id: p.id,
          name: p.nombre_producto,
          lanzamiento: p.nombre_lanzamiento,
          price: Number(p.precio),
          image: p.imagen || null,
          images: Array.isArray(p.imagenes) && p.imagenes.length > 0 ? p.imagenes : (p.imagen ? [p.imagen] : []),
          estado: p.estado,
          detalle: p.detalle || '',
          descripcion: p.descripcion || '',
          tallas: Array.isArray(p.tallas) ? p.tallas : [],
          seccionId: p.seccion_id || null
        }));
        setProductsList(formatted);
      })
      .catch(err => console.error('Error al obtener el catálogo:', err))
      .finally(() => setLoadingProducts(false));

    fetch(`${API_URL}/api/secciones`)
      .then(res => res.json())
      .then(data => setSecciones(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error al obtener las secciones:', err));
  }, []);

  // Secciones que de verdad se muestran como pestaña: solo las que tienen al
  // menos un producto activo, en el orden ya definido por el Admin.
  const seccionesConProductos = secciones.filter((s) =>
    productsList.some((p) => p.seccionId === s.id && p.estado !== 'suspendido')
  );

  const cambiarSeccion = (slugONull) => {
    setSeccionActiva(slugONull);
    const params = new URLSearchParams(window.location.search);
    if (slugONull) params.set('seccion', slugONull);
    else params.delete('seccion');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
  };

  const seccionActivaObj = seccionActiva ? seccionesConProductos.find((s) => slugify(s.nombre) === seccionActiva) : null;
  const productosVisibles = seccionActivaObj
    ? productsList.filter((p) => p.seccionId === seccionActivaObj.id)
    : productsList;

  // Abre la vista rápida del producto indicado en ?producto=<id> una vez que el
  // catálogo ya cargó (mismo patrón que la lectura de wompi_ref de más abajo).
  useEffect(() => {
    if (deepLinkProductId == null || productsList.length === 0) return;
    const match = productsList.find(p => p.id === deepLinkProductId);
    if (match && match.estado !== 'suspendido') setQuickViewProduct(match);
    setDeepLinkProductId(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('producto');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }, [deepLinkProductId, productsList]);

  // Al volver de un pago que sacó al cliente de la página (Nequi, PSE, etc.), Wompi
  // redirige de vuelta acá con la referencia y su propio ID de transacción en la URL.
  // En vez de confiar en un callback que en esos casos nunca llega, le pasamos ese ID
  // al backend para que consulte el estado real directo en Wompi y no haya que esperar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('wompi_ref');
    if (!ref) return;

    const transactionId = params.get('id');
    window.history.replaceState({}, '', window.location.pathname);
    setIsCartOpen(true);
    setCheckoutStep('verificando');

    let intentos = 0;
    const verificar = async () => {
      intentos += 1;
      try {
        const query = transactionId ? `?transactionId=${encodeURIComponent(transactionId)}` : '';
        const res = await fetch(`${API_URL}/api/wompi/estado/${ref}${query}`);
        if (res.ok) {
          const data = await res.json();
          if (data.estado_pago === 'APPROVED') {
            setCheckoutStep('success');
            setCart([]);
            return;
          }
          if (data.estado_pago && data.estado_pago !== 'PENDING') {
            setDeclineStatus(data.estado_pago);
            setCheckoutStep('declined');
            return;
          }
        }
      } catch (error) {
        console.error('Error al verificar el pago tras el regreso de Wompi:', error);
      }

      if (intentos < 8) {
        setTimeout(verificar, 2000);
      } else {
        setPaymentError('No pudimos confirmar tu pago automáticamente. Si Wompi te alcanzó a cobrar, escríbenos con tu referencia y lo confirmamos manualmente.');
        setDeclineStatus('');
        setCheckoutStep('declined');
      }
    };

    verificar();
  }, []);

  // Bloquea el scroll del body mientras el carrito o la vista rápida están abiertos.
  useEffect(() => {
    document.body.style.overflow = (isCartOpen || quickViewProduct) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen, quickViewProduct]);

  // Esc cierra lo que esté abierto (carrito o vista rápida).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setQuickViewProduct(null);
      setIsCartOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Máximo que se puede comprar de una vez en esa talla (10 por defecto, o el
  // stock real si es menor). Sin talla (producto sin tallas configuradas) no hay tope.
  const maxCompraDe = (item) => {
    if (!item.talla || !Array.isArray(item.tallas)) return Infinity;
    const t = item.tallas.find((x) => x.talla === item.talla);
    return t ? t.max_compra : Infinity;
  };

  // talla es opcional: se usa para diferenciar líneas del carrito del mismo
  // producto en tallas distintas (cada combinación producto+talla es su propia
  // línea; misma talla del mismo producto acumula cantidad).
  const addToCart = (product, quantity = 1, talla = null) => {
    const lineId = talla ? `${product.id}-${talla}` : String(product.id);
    setCart(prev => {
      const existing = prev.find(item => item.id === lineId);
      if (existing) {
        const tope = maxCompraDe(existing);
        return prev.map(item => item.id === lineId ? { ...item, quantity: Math.min(tope, item.quantity + quantity) } : item);
      }
      const nuevo = { ...product, id: lineId, productId: product.id, talla, quantity };
      return [...prev, { ...nuevo, quantity: Math.min(maxCompraDe(nuevo), quantity) }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, Math.min(maxCompraDe(item), item.quantity + delta));
        return newQty === 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Genera la factura en PDF, la descarga y devuelve el base64 para adjuntarla al correo
  const buildInvoicePdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("Factura - UNDER LAW", 20, 20);

    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Cliente: ${formData.name} ${formData.lastName}`, 20, 40);
    doc.text(`Documento: ${formData.doc}`, 20, 50);
    doc.text(`Correo: ${formData.email}`, 20, 60);

    let y = 80;
    doc.text("Productos:", 20, y);
    y += 10;
    let total = 0;
    cart.forEach(item => {
      const sub = item.price * item.quantity;
      total += sub;
      const tallaTxt = item.talla ? ` (Talla: ${item.talla})` : '';
      doc.text(`${item.quantity}x ${item.name}${tallaTxt} - $${sub.toLocaleString('es-CO')} COP`, 20, y);
      y += 10;
    });

    y += 10;
    doc.setFontSize(16);
    doc.text(`Total: $${total.toLocaleString('es-CO')} COP`, 20, y);

    const pdfBase64 = doc.output('datauristring');
    doc.save("factura-underlaw.pdf");
    return pdfBase64;
  };

  // Avisa al backend que el pedido PENDING se canceló (widget cerrado o pago rechazado)
  const cancelarPedidoBackend = async (reference, estado_pago) => {
    try {
      await fetch(`${API_URL}/api/wompi/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, estado_pago })
      });
    } catch (error) {
      console.error('Error al marcar el pedido como cancelado:', error);
    }
  };

  // Abre el Widget de Wompi (tarjeta y PSE) con los datos ya firmados por el backend
  const openWompiWidget = ({ reference, amountInCents, currency, publicKey, signature }) => {
    if (!window.WidgetCheckout) {
      setPaymentError('El widget de pago aún está cargando. Intenta de nuevo en un momento.');
      setIsProcessing(false);
      return;
    }

    setPaymentError('');

    const checkout = new window.WidgetCheckout({
      currency,
      amountInCents,
      reference,
      publicKey,
      signature: { integrity: signature },
      // Métodos como Nequi o PSE sacan al cliente de la página; sin esto, Wompi lo
      // devuelve a su propia pantalla genérica en vez de volver a nuestro sitio.
      redirectUrl: `${window.location.origin}${window.location.pathname}?wompi_ref=${encodeURIComponent(reference)}`,
      customerData: {
        email: formData.email,
        fullName: `${formData.name} ${formData.lastName}`,
        phoneNumber: formData.phone,
        phoneNumberPrefix: '+57',
        legalId: formData.doc,
        legalIdType: 'CC'
      }
    });

    let settled = false;

    // El SDK de Wompi NO llama a este callback cuando el usuario cierra el
    // widget manualmente (X, Esc, "volver al comercio") — en esos casos solo
    // le agrega el atributo "hidden" a su propio modal (clase .waybox-backdrop)
    // y nunca avisa al integrador. Lo detectamos por DOM para no depender de
    // un callback que en ese caso nunca llega.
    const observer = new MutationObserver((mutations) => {
      if (settled) return;
      for (const mutation of mutations) {
        const el = mutation.target;
        if (el instanceof HTMLElement && el.classList.contains('waybox-backdrop') && el.hasAttribute('hidden')) {
          settled = true;
          observer.disconnect();
          cancelarPedidoBackend(reference, 'VOIDED');
          setDeclineStatus('');
          setIsProcessing(false);
          setCheckoutStep('declined');
          return;
        }
      }
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });

    checkout.open(async (result) => {
      if (settled) return;
      settled = true;
      observer.disconnect();

      const transaction = result?.transaction;

      try {
        if (transaction && transaction.status === 'APPROVED') {
          // Generar el PDF es un "extra" para el cliente: si falla (p. ej. el
          // navegador bloquea la descarga), NO debe impedir que confirmemos el
          // pago con el backend — eso es lo que de verdad importa acá.
          let pdfBase64 = null;
          try {
            pdfBase64 = buildInvoicePdf();
          } catch (pdfError) {
            console.error('Error al generar la factura en PDF (el pago sí se confirma igual):', pdfError);
          }

          try {
            await fetch(`${API_URL}/api/wompi/confirmar`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference, pdfBase64 })
            });
          } catch (error) {
            console.error('Error al confirmar el pedido con el backend:', error);
          }

          setCheckoutStep('success');
          setCart([]);
        } else {
          // Pago rechazado/anulado (esto sí llega con transaction definido)
          cancelarPedidoBackend(reference, transaction?.status || 'VOIDED');
          setDeclineStatus(transaction?.status || '');
          setCheckoutStep('declined');
        }
      } catch (error) {
        // Red de seguridad: si algo inesperado falla arriba, igual liberamos el
        // botón de pago en vez de dejar la UI pegada en "Abriendo pago seguro...".
        console.error('Error inesperado al procesar el resultado del pago:', error);
        setPaymentError('Tu pago se procesó, pero hubo un problema al finalizar el pedido. Escríbenos si no recibes la confirmación.');
      } finally {
        setIsProcessing(false);
      }
    });
  };

  const handleWompiPayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setPaymentError('');

    try {
      const response = await fetch(`${API_URL}/api/wompi/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, cart })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo iniciar el pago');
      }

      openWompiWidget(data);
    } catch (error) {
      console.error('Error al iniciar el pago con Wompi:', error);
      setPaymentError('Hubo un error al iniciar el pago. Intenta de nuevo.');
      setIsProcessing(false);
    }
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCarrito = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="products-page">
      <section className="collection-hero">
        <div className="container">
          <div className="collection-top">
            <div>
              <p className="eyebrow">Legacy of Luxury</p>
              <h1 className="collection-h1">Colección</h1>
            </div>
            <button onClick={() => setIsCartOpen(true)} aria-label="Ver pedido" className="cart-btn">
              <ShoppingBag size={22} strokeWidth={1.5} />
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </button>
          </div>

          {seccionesConProductos.length > 0 && (
            <div className="seccion-tabs" role="tablist" aria-label="Secciones de la colección">
              <button
                role="tab"
                aria-selected={!seccionActivaObj}
                onClick={() => cambiarSeccion(null)}
                className={`seccion-tab ${!seccionActivaObj ? 'seccion-tab-activa' : ''}`}
              >
                Todo
              </button>
              {seccionesConProductos.map((s) => {
                const slug = slugify(s.nombre);
                return (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={seccionActivaObj?.id === s.id}
                    onClick={() => cambiarSeccion(slug)}
                    className={`seccion-tab ${seccionActivaObj?.id === s.id ? 'seccion-tab-activa' : ''}`}
                  >
                    {s.nombre}
                  </button>
                );
              })}
            </div>
          )}

          <div className="products-grid">
            {loadingProducts ? (
              <p style={{ color: 'var(--text-muted)' }}>Cargando colección...</p>
            ) : productosVisibles.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Aún no hay productos disponibles. Vuelve pronto.</p>
            ) : productosVisibles.map((product, index) => {
              const disponible = product.estado !== 'suspendido';
              const tallasTexto = !disponible ? 'Sin stock' : (product.tallas.map((t) => t.talla).join(' · ') || '');
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                  transition={{ duration: 0.7, delay: (index % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="product-card"
                >
                  <div className="product-media">
                    {product.images.length > 0 ? (
                      <ProductImageCarousel
                        images={product.images}
                        alt={product.name}
                        imgClassName="product-image"
                        imgStyle={{ opacity: disponible ? 1 : 0.42 }}
                      />
                    ) : (
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: disponible ? 1 : 0.42 }}
                        className="product-image"
                      />
                    )}
                    <span className="product-tag" style={{ color: disponible ? 'var(--gold)' : 'var(--text-muted)' }}>
                      {disponible ? (product.lanzamiento || 'Colección') : 'Agotado'}
                    </span>
                    <div className="product-overlay">
                      <button
                        onClick={() => disponible && setQuickViewProduct(product)}
                        disabled={!disponible}
                        className="premium-button"
                        style={{ width: '100%' }}
                      >
                        {disponible ? 'Ver producto' : 'No disponible'}
                      </button>
                    </div>
                  </div>
                  <div className="product-info-row">
                    <div>
                      <p className="product-name">{product.name}</p>
                      {tallasTexto && <p className="product-tallas">{tallasTexto}</p>}
                    </div>
                    <p className="product-price tabular">${product.price.toLocaleString('es-CO')} COP</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Franja de info ── */}
      <section className="info-strip">
        <div className="container info-grid">
          {[['Envío', '2 a 5 días hábiles'], ['Cambios', '5 días para talla'], ['Pago', 'Tarjeta, PSE y Nequi'], ['Serie', '50 por drop']].map(([k, v]) => (
            <div key={k} className="info-cell">
              <p className="info-cell-label">{k}</p>
              <p className="info-cell-value">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="drawer-scrim"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="drawer"
            >
              <div className="drawer-head">
                <span className="eyebrow">
                  {checkoutStep === 'cart' ? 'Expediente — Pedido' : checkoutStep === 'info' ? 'Tus datos' : checkoutStep === 'address' ? 'Dirección de envío' : checkoutStep === 'payment' ? 'Pago' : checkoutStep === 'verificando' ? 'Verificando pago' : checkoutStep === 'declined' ? 'Pago no completado' : 'Gracias'}
                </span>
                <button onClick={() => { setIsProcessing(false); setIsCartOpen(false); setTimeout(() => setCheckoutStep('cart'), 500); }} aria-label="Cerrar" style={{ color: 'var(--text-primary)' }}><X size={22} /></button>
              </div>

              {checkoutStep === 'cart' && (
                cart.length === 0 ? (
                  <div className="drawer-empty">
                    <p style={{ color: 'var(--text-muted)' }}>Tu carrito está vacío.</p>
                    <button onClick={() => setIsCartOpen(false)} className="cta-outline">Ver la colección</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '0.5rem' }}>
                      {cart.map(item => (
                        <div key={item.id} className="drawer-item" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>
                          <img src={item.image} alt={item.name} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '1.05rem', fontFamily: 'var(--font-serif)' }}>{item.name}</p>
                            <p className="tabular" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0.75rem' }}>{item.talla ? `Talla ${item.talla} · ` : ''}${item.price.toLocaleString('es-CO')} COP</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                              <button onClick={() => updateQuantity(item.id, -1)} className="stepper-btn"><Minus size={12} /></button>
                              <span style={{ fontSize: '0.9rem' }}>{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                disabled={item.quantity >= maxCompraDe(item)}
                                className="stepper-btn"
                                style={{ opacity: item.quantity >= maxCompraDe(item) ? 0.4 : 1, cursor: item.quantity >= maxCompraDe(item) ? 'not-allowed' : 'pointer' }}
                              ><Plus size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ flexShrink: 0, paddingTop: '1.5rem', borderTop: '1px solid var(--border-soft)', marginTop: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.05rem' }}>
                        <span>Total</span>
                        <span className="tabular">${totalCarrito.toLocaleString('es-CO')} COP</span>
                      </div>
                      <button className="premium-button" onClick={() => setCheckoutStep('info')} style={{ width: '100%' }}>Finalizar pedido</button>
                    </div>
                  </div>
                )
              )}

              {checkoutStep === 'info' && (
                <form onSubmit={(e) => { e.preventDefault(); setCheckoutStep('address'); }} className="drawer-form" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label className="drawer-field">
                      <span>Nombre</span>
                      <input type="text" name="name" required value={formData.name} onChange={handleInputChange} />
                    </label>
                    <label className="drawer-field">
                      <span>Apellido</span>
                      <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} />
                    </label>
                  </div>
                  <label className="drawer-field">
                    <span>Documento (CC)</span>
                    <input type="text" name="doc" required value={formData.doc} onChange={handleInputChange} />
                  </label>
                  <label className="drawer-field">
                    <span>Teléfono</span>
                    <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} />
                  </label>
                  <label className="drawer-field">
                    <span>Correo electrónico</span>
                    <input type="email" name="email" required value={formData.email} onChange={handleInputChange} />
                  </label>

                  <div className="drawer-form-footer">
                    <button type="submit" className="premium-button" style={{ width: '100%' }}>Continuar proceso</button>
                    <button type="button" onClick={() => setCheckoutStep('cart')} className="drawer-link">Volver al carrito</button>
                  </div>
                </form>
              )}

              {checkoutStep === 'address' && (
                <form onSubmit={(e) => { e.preventDefault(); setCheckoutStep('payment'); }} className="drawer-form" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <label className="drawer-field">
                    <span>País</span>
                    <input type="text" name="pais" required value={formData.pais} onChange={handleInputChange} />
                  </label>
                  <label className="drawer-field">
                    <span>Municipio</span>
                    <input type="text" name="municipio" required value={formData.municipio} onChange={handleInputChange} />
                  </label>
                  <label className="drawer-field">
                    <span>Ciudad</span>
                    <input type="text" name="ciudad" required value={formData.ciudad} onChange={handleInputChange} />
                  </label>
                  <label className="drawer-field">
                    <span>Dirección</span>
                    <input type="text" name="direccion" required value={formData.direccion} onChange={handleInputChange} />
                  </label>

                  <div className="drawer-form-footer">
                    <button type="submit" className="premium-button" style={{ width: '100%' }}>Continuar al pago</button>
                    <button type="button" onClick={() => setCheckoutStep('info')} className="drawer-link">Volver atrás</button>
                  </div>
                </form>
              )}

              {checkoutStep === 'payment' && (
                <form onSubmit={handleWompiPayment} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                      <span>Total a pagar</span>
                      <span className="tabular">${totalCarrito.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div className="payment-summary">
                      {cart.map((item) => (
                        <div key={item.id} className="payment-summary-row">
                          <span>{item.name}{item.talla ? ` · Talla ${item.talla}` : ''} × {item.quantity}</span>
                          <span className="tabular" style={{ color: 'var(--text-primary)' }}>${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.7, margin: 0 }}>Al continuar se abre el widget seguro de Wompi (tarjeta, PSE o Nequi). El pago lo procesa Wompi, no esta página.</p>
                    {paymentError && <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: 0 }}>{paymentError}</p>}
                  </div>

                  <div className="drawer-form-footer">
                    <button type="submit" disabled={isProcessing} className="premium-button" style={{ width: '100%', opacity: isProcessing ? 0.6 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                      {isProcessing ? 'Abriendo pago seguro…' : 'Pagar con Wompi'}
                    </button>
                    <button type="button" onClick={() => setCheckoutStep('address')} className="drawer-link">Volver atrás</button>
                  </div>
                </form>
              )}

              {checkoutStep === 'verificando' && (
                <div className="drawer-status">
                  <span className="drawer-spinner" />
                  <h3 className="drawer-status-title">Verificando tu pago…</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Esto solo toma unos segundos. No cierres esta ventana.</p>
                </div>
              )}

              {checkoutStep === 'declined' && (
                <div className="drawer-status">
                  <span className="drawer-status-icon drawer-status-icon-error">✕</span>
                  <h3 className="drawer-status-title">Pago no completado</h3>
                  <p style={{ color: 'var(--text-tertiary)', lineHeight: 1.7, maxWidth: '32ch' }}>
                    {declineStatus
                      ? `Tu pago no fue aprobado (estado: ${declineStatus}).`
                      : 'Cerraste la ventana de pago antes de completarlo.'} Tu carrito sigue disponible, no se hizo ningún cargo.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                    <button onClick={() => { setDeclineStatus(''); setCheckoutStep('payment'); }} className="premium-button" style={{ flex: 1 }}>Intentar de nuevo</button>
                    <button onClick={() => { setIsCartOpen(false); setTimeout(() => setCheckoutStep('cart'), 500); }} className="cta-outline" style={{ flex: 1, textAlign: 'center' }}>Seguir navegando</button>
                  </div>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="drawer-status">
                  <span className="drawer-status-icon drawer-status-icon-gold">✓</span>
                  <h3 className="drawer-status-title">¡Pago exitoso!</h3>
                  <p style={{ color: 'var(--text-tertiary)', lineHeight: 1.7, maxWidth: '32ch' }}>Tu factura en PDF ha sido generada y descargada. Te enviamos un comprobante al correo: {formData.email}</p>
                  <button onClick={() => { setIsCartOpen(false); setTimeout(() => setCheckoutStep('cart'), 500); }} className="premium-button" style={{ padding: '0.95rem 2.5rem' }}>Cerrar</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Quick View Modal */}
      <AnimatePresence>
        {quickViewProduct && (
          <QuickViewModal
            key={quickViewProduct.id}
            product={quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
            onAddToCart={addToCart}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .collection-hero { padding: clamp(2.5rem, 7vw, 5rem) 0 clamp(3rem, 7vw, 5rem); }
        .collection-top {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;
          margin-bottom: clamp(1.75rem, 4vw, 2.5rem);
        }
        .collection-h1 {
          font-weight: 300; font-size: clamp(2.6rem, 9vw, 6rem); line-height: 0.92; letter-spacing: -0.03em; margin-top: 0.75rem;
        }
        .cart-btn {
          position: relative; color: var(--text-primary); display: flex; padding: 0.5rem; flex-shrink: 0; margin-top: 0.5rem;
        }
        .cart-badge {
          position: absolute; top: 0; right: 0; background: var(--gold); color: var(--bg-primary);
          border-radius: 50%; width: 18px; height: 18px; font-size: 0.65rem; display: flex;
          align-items: center; justify-content: center; font-weight: 500;
        }

        .seccion-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: clamp(1.75rem, 4vw, 2.75rem); }
        .seccion-tab {
          font-family: var(--font-serif); font-style: italic; font-size: 0.95rem;
          padding: 0.55rem 1.3rem; cursor: pointer; white-space: nowrap;
          background: transparent; color: var(--text-muted); border: 1px solid var(--border-strong);
          transition: var(--transition);
        }
        .seccion-tab-activa { background: var(--text-primary); color: var(--bg-primary); border-color: var(--text-primary); }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
          gap: clamp(1.5rem, 3vw, 2.75rem);
        }
        .product-media {
          position: relative; overflow: hidden; background: var(--bg-tertiary);
          border: 1px solid var(--border); aspect-ratio: 3/4;
        }
        .product-image { transition: transform 0.9s cubic-bezier(.16,1,.3,1); width: 100%; height: 100%; object-fit: cover; display: block; }
        .product-card:hover .product-image { transform: scale(1.05); }
        .product-tag {
          position: absolute; top: 0.7rem; left: 0.7rem; font-size: 0.56rem; text-transform: uppercase;
          letter-spacing: 0.18em; background: rgba(6,6,6,0.82); padding: 0.32rem 0.6rem;
        }
        .product-overlay {
          position: absolute; bottom: 1rem; left: 1rem; right: 1rem;
          opacity: 0; transform: translateY(10px); transition: all 0.45s cubic-bezier(.16,1,.3,1);
        }
        .product-card:hover .product-overlay { opacity: 1; transform: translateY(0); }
        .product-info-row { display: flex; justify-content: space-between; gap: 1rem; margin-top: 0.9rem; }
        .product-name { margin: 0; font-family: var(--font-serif); font-size: 1.1rem; }
        .product-tallas { margin: 0.25rem 0 0; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.18em; color: var(--text-muted); }
        .product-price { margin: 0; font-size: 0.88rem; white-space: nowrap; }

        .info-strip { background: var(--bg-light); color: var(--text-on-light); padding: clamp(2.5rem, 6vw, 4rem) 0; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 1px; background: var(--border-light); }
        .info-cell { background: var(--bg-light); padding: 1.5rem 1.25rem; }
        .info-cell-label { margin: 0; font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--text-dim); }
        .info-cell-value { margin: 0.55rem 0 0; font-family: var(--font-serif); font-size: 1.3rem; color: var(--text-on-light); }

        .drawer-scrim { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; }
        .drawer {
          position: fixed; top: 0; right: 0; bottom: 0; width: 100%; max-width: 430px;
          background: var(--bg-tertiary); z-index: 101; padding: clamp(1.25rem, 4vw, 2rem);
          border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden;
        }
        .drawer-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-shrink: 0; }
        .drawer-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1.25rem; }
        .drawer-item { display: flex; gap: 1.25rem; align-items: center; }
        .drawer-item img { width: 76px; aspect-ratio: 3/4; object-fit: cover; background: var(--bg-primary); flex-shrink: 0; }
        .stepper-btn { padding: 0.3rem; border: 1px solid var(--border-strong); background: none; color: var(--text-primary); cursor: pointer; display: flex; }
        .drawer-form { display: flex; flex-direction: column; gap: 1.35rem; }
        .drawer-field { display: flex; flex-direction: column; gap: 0.5rem; }
        .drawer-field span { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.18em; color: var(--text-muted); }
        .drawer-field input {
          background: transparent; border: none; border-bottom: 1px solid var(--border-strong);
          color: var(--text-primary); padding: 0.5rem 0; font-size: 0.95rem; font-family: var(--font-sans); outline: none;
        }
        .drawer-form-footer { margin-top: auto; flex-shrink: 0; padding-top: 1rem; }
        .drawer-link { width: 100%; padding: 0.9rem; background: none; border: none; color: var(--text-muted); font-family: inherit; font-size: 0.78rem; cursor: pointer; margin-top: 0.4rem; }
        .payment-summary { display: grid; gap: 1px; background: var(--border); }
        .payment-summary-row { background: var(--bg-tertiary); padding: 0.85rem 0; display: flex; justify-content: space-between; gap: 1rem; font-size: 0.85rem; color: var(--text-tertiary); }
        .drawer-status { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1.5rem; }
        .drawer-status-title { font-family: var(--font-serif); font-style: italic; font-weight: 300; font-size: 1.4rem; margin: 0; }
        .drawer-spinner {
          width: 56px; height: 56px; border-radius: 50%; border: 2px solid var(--border-strong);
          border-top-color: var(--gold); display: block; animation: spin 0.8s linear infinite;
        }
        .drawer-status-icon {
          width: 58px; height: 58px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
        }
        .drawer-status-icon-error { border: 1px solid var(--error); color: var(--error); }
        .drawer-status-icon-gold { border: 1px solid var(--gold); color: var(--gold); }

        @media (max-width: 768px) {
          .products-grid { gap: 2rem; }
        }
      `}</style>
    </div>
  );
};

export default Products;
