import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import Privacidad from './pages/Privacidad';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import CookieBanner from './components/CookieBanner';
import { initIfConsented } from './utils/analytics';

import Admin from './pages/Admin';

// El Admin tiene su propio header y no lleva el navbar/footer/WhatsApp del sitio.
function SiteChrome() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="app-container">
      {!isAdmin && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <WhatsAppButton />}
      {!isAdmin && <CookieBanner />}
    </div>
  );
}

function App() {
  useEffect(() => {
    initIfConsented();
  }, []);

  return (
    <Router>
      <SiteChrome />
      <Analytics />
      <SpeedInsights />
    </Router>
  );
}

export default App;
