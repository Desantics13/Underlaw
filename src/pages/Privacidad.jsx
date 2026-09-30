import React from 'react';

const TERMINOS = [
  {
    titulo: '1. Quién vende',
    cuerpo: 'UNDER LAW es una tienda de streetwear en series cortas, con operación en Cartagena, Colombia. Puedes contactarnos por WhatsApp, Instagram (@underla.w) o al correo underlawcompany@gmail.com para cualquier duda sobre un pedido.'
  },
  {
    titulo: '2. Precios y medios de pago',
    cuerpo: 'Los precios publicados están en pesos colombianos (COP) e incluyen los impuestos aplicables. El costo de envío se informa antes de confirmar el pago. Aceptamos tarjeta débito y crédito, PSE y Nequi, procesados de forma segura por Wompi: nosotros nunca vemos ni almacenamos los datos de tu tarjeta.'
  },
  {
    titulo: '3. Tiempos de entrega',
    cuerpo: 'El tiempo estimado de entrega es de 2 a 5 días hábiles dentro de Colombia, contados desde que el pago queda aprobado. Te avisamos por correo en cada actualización relevante de tu pedido.'
  },
  {
    titulo: '4. Cambios y garantía',
    cuerpo: 'Tienes 5 días calendario desde que recibes tu pedido para solicitar un cambio de talla, sujeto a disponibilidad. Si tu producto llega con un defecto de fabricación, cubrimos el cambio o la garantía legal correspondiente sin costo para ti.'
  },
  {
    titulo: '5. Derecho de retracto',
    cuerpo: 'Como comprador, tienes derecho a retractarte de tu compra dentro de los 5 días hábiles siguientes a la entrega del producto, sin tener que justificar tu decisión, según el artículo 47 de la Ley 1480 de 2011. El producto debe devolverse sin uso y en su empaque original; nosotros cubrimos el reembolso una vez lo recibimos y verificamos su estado.'
  },
  {
    titulo: '6. Reversión del pago',
    cuerpo: 'Tienes derecho a que se reverse el pago cuando seas víctima de fraude, cuando el producto no llegue, o cuando llegue en condiciones distintas a las ofrecidas o con defectos. Para solicitarla, escríbenos indicando tu número de pedido; si aplica, coordinamos la reversión con Wompi y tu entidad financiera.'
  },
  {
    titulo: '7. Autoridad de vigilancia',
    cuerpo: 'Como consumidor, puedes presentar quejas o consultas ante la Superintendencia de Industria y Comercio (SIC): '
  }
];

const PRIVACIDAD = [
  {
    titulo: '1. Responsable del tratamiento',
    cuerpo: 'UNDER LAW ("nosotros"), con operación en Cartagena, Colombia, es responsable del tratamiento de los datos personales que recolecta a través de este sitio (underlaw.site) y sus canales de contacto (WhatsApp, Instagram, correo electrónico).'
  },
  {
    titulo: '2. Marco legal',
    cuerpo: 'Este tratamiento se rige por la Ley 1581 de 2012 (Ley Estatutaria de Protección de Datos Personales), su decreto reglamentario 1377 de 2013, y demás normas que los desarrollen o sustituyan, bajo la vigilancia de la Superintendencia de Industria y Comercio (SIC).'
  },
  {
    titulo: '3. Datos que recolectamos',
    cuerpo: 'Según el formulario que uses, podemos recolectar: nombre, apellido, número de documento de identidad, teléfono, correo electrónico y dirección de envío (al hacer un pedido); o nombre, correo y teléfono (al inscribirte a un próximo lanzamiento). No solicitamos datos financieros: el pago se procesa directamente por Wompi, nosotros nunca vemos ni almacenamos números de tarjeta.'
  },
  {
    titulo: '4. Finalidad del tratamiento',
    cuerpo: 'Usamos tus datos únicamente para: procesar y dar seguimiento a tu pedido (incluida la facturación y el envío), contactarte sobre el estado de tu compra, avisarte cuando un producto al que te inscribiste queda disponible, y prevenir fraude. No usamos tus datos para publicidad de terceros ni los vendemos.'
  },
  {
    titulo: '5. Con quién se comparten',
    cuerpo: 'Para operar, compartimos lo estrictamente necesario con proveedores que procesan datos en nuestro nombre: Wompi (pasarela de pago, procesa tu transacción), Resend (envío de los correos de confirmación y factura), Railway/Vercel (infraestructura donde corre el sitio) y, solo si aceptas el aviso de cookies, PostHog (analítica anónima de navegación, para entender y mejorar el proceso de compra). Ninguno de ellos puede usar tus datos para fines propios.'
  },
  {
    titulo: '6. Tus derechos (Habeas Data)',
    cuerpo: 'Como titular de tus datos, en cualquier momento puedes: conocer, actualizar y rectificar tu información; solicitar prueba de la autorización otorgada; ser informado del uso que le hemos dado; presentar quejas ante la SIC; revocar tu autorización; y solicitar la supresión de tus datos cuando no exista un deber legal o contractual que nos obligue a conservarlos (por ejemplo, registros contables de una compra ya facturada).'
  },
  {
    titulo: '7. Cómo ejercer tus derechos',
    cuerpo: 'Escríbenos a underlawcompany@gmail.com o por WhatsApp indicando tu solicitud y los datos que te identifiquen como titular. Responderemos dentro de los términos que establece la ley (10 días hábiles para consultas, 15 días hábiles para reclamos).'
  },
  {
    titulo: '8. Seguridad y conservación',
    cuerpo: 'Tus datos se almacenan en infraestructura con acceso restringido y se conservan solo mientras sea necesario para la finalidad descrita o mientras la ley lo exija (por ejemplo, para efectos contables/tributarios).'
  }
];

const Privacidad = () => {
  return (
    <div className="legal-page">
      <section className="legal-hero">
        <div className="container">
          <p className="eyebrow">Under Law</p>
          <h1 className="legal-h1">Términos y Privacidad</h1>
          <p className="legal-updated">Última actualización: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </section>

      <section className="legal-body">
        <div className="container">
          <h2 className="legal-part">Términos y Condiciones de Compra</h2>
          <p className="legal-part-note">Exigidos por el Estatuto del Consumidor (Ley 1480 de 2011) para el comercio electrónico.</p>
          {TERMINOS.map((s) => (
            <div key={s.titulo} className="legal-block">
              <h3>{s.titulo}</h3>
              <p>
                {s.cuerpo}
                {s.titulo.startsWith('7.') && (
                  <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer">www.sic.gov.co</a>
                )}
              </p>
            </div>
          ))}

          <h2 className="legal-part legal-part-spaced">Política de Tratamiento de Datos Personales</h2>
          <p className="legal-part-note">Exigida por la Ley 1581 de 2012 (Habeas Data).</p>
          {PRIVACIDAD.map((s) => (
            <div key={s.titulo} className="legal-block">
              <h3>{s.titulo}</h3>
              <p>{s.cuerpo}</p>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .legal-hero { padding: clamp(3.5rem, 8vw, 6rem) 0 2.5rem; border-bottom: 1px solid var(--border-soft); }
        .legal-h1 { font-size: clamp(1.9rem, 4vw, 2.8rem); margin: 0.6rem 0 0.8rem; }
        .legal-updated { color: var(--text-muted); font-size: 0.82rem; }
        .legal-body { padding: clamp(2.5rem, 6vw, 4rem) 0 clamp(4rem, 8vw, 6rem); }
        .legal-part { font-size: clamp(1.3rem, 2.5vw, 1.7rem); max-width: 72ch; }
        .legal-part-spaced { margin-top: clamp(3rem, 6vw, 4.5rem); padding-top: clamp(2.5rem, 5vw, 3.5rem); border-top: 1px solid var(--border-soft); }
        .legal-part-note { color: var(--text-dim); font-size: 0.82rem; margin: 0.6rem 0 2rem; max-width: 72ch; }
        .legal-block { max-width: 72ch; margin-bottom: 2.25rem; }
        .legal-block h3 { font-family: var(--font-sans); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--gold); margin-bottom: 0.75rem; font-weight: 500; }
        .legal-block p { color: var(--text-tertiary); line-height: 1.8; font-size: 0.95rem; }
        .legal-block p a { color: var(--text-secondary); text-decoration: underline; }
        .legal-block p a:hover { color: var(--gold); }
      `}</style>
    </div>
  );
};

export default Privacidad;
