import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus } from 'lucide-react';
import { jsPDF } from "jspdf";
import ProductImageCarousel from '../components/ProductImageCarousel';
import QuickViewModal from '../components/QuickViewModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WOMPI_WIDGET_SCRIPT_ID = 'wompi-widget-script';

const Products = () => {
  const [productsList, setProductsList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
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
          estado: p.estado
        }));
        setProductsList(formatted);
      })
      .catch(err => console.error('Error al obtener el catálogo:', err))
      .finally(() => setLoadingProducts(false));
  }, []);

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

  // talla es opcional: se usa para diferenciar líneas del carrito del mismo
  // producto en tallas distintas (cada combinación producto+talla es su propia
  // línea; misma talla del mismo producto acumula cantidad).
  const addToCart = (product, quantity = 1, talla = null) => {
    const lineId = talla ? `${product.id}-${talla}` : String(product.id);
    setCart(prev => {
      const existing = prev.find(item => item.id === lineId);
      if (existing) {
        return prev.map(item => item.id === lineId ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, id: lineId, productId: product.id, talla, quantity }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
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

  return (
    <div className="products-page" style={{ paddingTop: '10rem', minHeight: '100vh', position: 'relative' }}>
      <div className="container">
        <header className="collection-header">
          <div>
            <h1 className="font-serif italic collection-h1" style={{ marginBottom: '1rem' }}>Colección</h1>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            style={{ position: 'relative', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ShoppingCart size={28} strokeWidth={1.5} color="white" />
            {cart.length > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, background: 'white', color: 'black', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </button>
        </header>

        <div className="products-grid">
          {loadingProducts ? (
            <p style={{ color: 'var(--text-muted)' }}>Cargando colección...</p>
          ) : productsList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Aún no hay productos disponibles. Vuelve pronto.</p>
          ) : productsList.map((product, index) => {
            const disponible = product.estado !== 'suspendido';
            return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="product-card"
            >
              <div className="premium-card" style={{ position: 'relative', marginBottom: '1.5rem', aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0c0c0c', overflow: 'hidden' }}>
                {product.images.length > 0 ? (
                  <ProductImageCarousel
                    images={product.images}
                    alt={product.name}
                    imgClassName="product-image"
                    imgStyle={{ transition: 'transform 0.6s ease', opacity: disponible ? 1 : 0.4 }}
                  />
                ) : (
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease', opacity: disponible ? 1 : 0.4 }}
                    className="product-image"
                  />
                )}
                {disponible ? (
                  <div className="card-overlay" style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', right: '1.5rem', opacity: 0, transition: 'var(--transition)' }}>
                    <button onClick={() => setQuickViewProduct(product)} className="premium-button" style={{ width: '100%', padding: '1rem' }}>Ver producto</button>
                  </div>
                ) : (
                  <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.85)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.4rem 0.8rem' }}>
                    No disponible
                  </div>
                )}
              </div>
              {product.lanzamiento && (
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{product.lanzamiento}</p>
              )}
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: '400' }}>{product.name}</h3>
              <p style={{ fontSize: '1.1rem', fontWeight: '300' }}>${product.price.toLocaleString('es-CO')} COP</p>
            </motion.div>
            );
          })}
        </div>
      </div>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 100 }}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '450px', height: '100%', background: 'var(--bg-secondary)', zIndex: 101, padding: '3rem 2rem', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexShrink: 0 }}>
                <h2 className="font-serif italic" style={{ fontSize: '2rem' }}>
                  {checkoutStep === 'cart' ? 'Tu Carrito' : checkoutStep === 'info' ? 'Tus Datos' : checkoutStep === 'address' ? 'Dirección de Envío' : checkoutStep === 'payment' ? 'Pago' : checkoutStep === 'verificando' ? 'Verificando Pago' : checkoutStep === 'declined' ? 'Pago no completado' : '¡Gracias!'}
                </h2>
                <button onClick={() => { setIsProcessing(false); setIsCartOpen(false); setTimeout(() => setCheckoutStep('cart'), 500); }}><X size={24} /></button>
              </div>

              {checkoutStep === 'cart' && (
                cart.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: '5rem', flex: 1 }}>
                    <p style={{ color: 'var(--text-muted)' }}>Tu carrito está vacío.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem', paddingRight: '1rem' }}>
                      {cart.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          <img src={item.image} alt={item.name} style={{ width: '80px', background: '#0c0c0c' }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>{item.name}</p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>${item.price.toLocaleString('es-CO')} COP</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <button onClick={() => updateQuantity(item.id, -1)} style={{ padding: '4px', border: '1px solid var(--border)', color: 'white' }}><Minus size={14} /></button>
                              <span style={{ color: 'white' }}>{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} style={{ padding: '4px', border: '1px solid var(--border)', color: 'white' }}><Plus size={14} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ flexShrink: 0, paddingTop: '2rem', borderTop: '1px solid var(--border)', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '1.2rem' }}>
                        <span>Total</span>
                        <span>${(cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)).toLocaleString('es-CO')} COP</span>
                      </div>
                      <button className="premium-button" onClick={() => setCheckoutStep('info')} style={{ width: '100%', padding: '1.2rem' }}>Finalizar Pedido</button>
                    </div>
                  </div>
                )
              )}

              {checkoutStep === 'info' && (
                <form onSubmit={(e) => { e.preventDefault(); setCheckoutStep('address'); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto', paddingRight: '1rem', paddingBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nombre</label>
                        <input type="text" name="name" required value={formData.name} onChange={handleInputChange} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', padding: '0.5rem 0' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Apellido</label>
                        <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', padding: '0.5rem 0' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Documento (CC)</label>
                      <input type="text" name="doc" required value={formData.doc} onChange={handleInputChange} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', padding: '0.5rem 0' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Teléfono</label>
                      <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', padding: '0.5rem 0' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Correo Electrónico</label>
                      <input type="email" name="email" required value={formData.email} onChange={handleInputChange} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', padding: '0.5rem 0' }} />
                    </div>
                  </div>
                  
                  <div style={{ flexShrink: 0, paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button type="submit" className="premium-button" style={{ width: '100%', padding: '1.2rem' }}>Continuar Proceso</button>
                    <button type="button" onClick={() => setCheckoutStep('cart')} style={{ width: '100%', padding: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', marginTop: '0.5rem', cursor: 'pointer' }}>Volver al Carrito</button>
                  </div>
                </form>
              )}

              {checkoutStep === 'address' && (
                <form onSubmit={(e) => { e.preventDefault(); setCheckoutStep('payment'); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto', paddingRight: '1rem', paddingBottom: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>País</label>
                      <input type="text" name="pais" required value={formData.pais} onChange={handleInputChange} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', padding: '0.5rem 0' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Municipio</label>
                      <input type="text" name="municipio" required value={formData.municipio} onChange={handleInputChange} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', padding: '0.5rem 0' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Ciudad</label>
                      <input type="text" name="ciudad" required value={formData.ciudad} onChange={handleInputChange} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', padding: '0.5rem 0' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Dirección</label>
                      <input type="text" name="direccion" required value={formData.direccion} onChange={handleInputChange} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', padding: '0.5rem 0' }} />
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button type="submit" className="premium-button" style={{ width: '100%', padding: '1.2rem' }}>Continuar al Pago</button>
                    <button type="button" onClick={() => setCheckoutStep('info')} style={{ width: '100%', padding: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', marginTop: '0.5rem', cursor: 'pointer' }}>Volver atrás</button>
                  </div>
                </form>
              )}

              {checkoutStep === 'payment' && (
                <form onSubmit={handleWompiPayment} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, overflowY: 'auto', paddingRight: '1rem', paddingBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                      <span>Total a pagar</span>
                      <span>${(cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)).toLocaleString('es-CO')} COP</span>
                    </div>
                    {paymentError && (
                      <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{paymentError}</p>
                    )}
                  </div>

                  <div style={{ flexShrink: 0, paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button type="submit" disabled={isProcessing} className="premium-button" style={{ width: '100%', padding: '1.2rem', opacity: isProcessing ? 0.6 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                      {isProcessing ? 'Abriendo pago seguro...' : 'Pagar con Wompi'}
                    </button>
                    <button type="button" onClick={() => setCheckoutStep('address')} style={{ width: '100%', padding: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', marginTop: '0.5rem', cursor: 'pointer' }}>Volver atrás</button>
                  </div>
                </form>
              )}

              {checkoutStep === 'verificando' && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 100px)' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'white', marginBottom: '2rem', animation: 'spin 0.8s linear infinite' }} />
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Verificando tu pago...</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Esto solo toma unos segundos. No cierres esta ventana.</p>
                </div>
              )}

              {checkoutStep === 'declined' && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 100px)' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                    <X size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Pago no completado</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    {declineStatus
                      ? `Tu pago no fue aprobado (estado: ${declineStatus}).`
                      : 'Cerraste la ventana de pago antes de completarlo.'} Tu carrito sigue disponible, no se hizo ningún cargo.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => { setDeclineStatus(''); setCheckoutStep('payment'); }} className="premium-button" style={{ padding: '1rem 2rem' }}>Intentar de nuevo</button>
                    <button onClick={() => { setIsCartOpen(false); setTimeout(() => setCheckoutStep('cart'), 500); }} style={{ padding: '1rem 2rem', background: 'transparent', border: '1px solid var(--border)', color: 'white', cursor: 'pointer' }}>Seguir navegando</button>
                  </div>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 100px)' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '2rem' }}>✓</span>
                  </div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>¡Pago Exitoso!</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Tu factura en PDF ha sido generada y descargada. Te enviamos un comprobante al correo: {formData.email}</p>
                  <button onClick={() => { setIsCartOpen(false); setTimeout(() => setCheckoutStep('cart'), 500); }} className="premium-button" style={{ padding: '1rem 3rem' }}>Cerrar</button>
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
        .product-card:hover .product-image { transform: scale(1.05); }
        .product-card:hover .card-overlay { opacity: 1 !important; transform: translateY(-10px); }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 4rem;
        }
        .collection-header {
          margin-bottom: 5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .collection-h1 {
          font-size: 4rem;
        }
        @media (max-width: 768px) {
          .products-grid {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
          .collection-header {
            margin-bottom: 3rem;
            flex-wrap: wrap;
            gap: 1rem;
          }
          .collection-h1 {
            font-size: 2.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Products;
