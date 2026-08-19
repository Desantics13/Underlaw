import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import buddhaModelImg from '../assets/buddha-model.jpg';
import oversizedFirstImg from '../assets/oversized-first.jpg';

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

const Home = () => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [formData, setFormData] = useState({ name: '', lastName: '', phone: '', email: '' });

  const currentProduct = featuredProducts[featuredIndex];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Pedido iniciado. Nos pondremos en contacto contigo.');
    setShowCheckout(false);
  };

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

      {/* ── Featured Product ── */}
      <section className="container" style={{ padding: 'clamp(4rem, 10vw, 10rem) 0' }}>
        <div className="featured-grid">
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
        </div>
      </section>

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
