/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import FabricTech from './components/FabricTech';
import OurStory from './components/OurStory';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { LanguageProvider } from './i18n/LanguageContext';
import { CartProvider } from './context/CartContext';
import CartDrawer from './components/CartDrawer';
import ScrollProgress from './components/ScrollProgress';
import OrderStatusModal from './components/OrderStatusModal';
import CheckoutModal from './components/CheckoutModal';
import BackToTop from './components/BackToTop';
import ProfileModal from './components/ProfileModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductsProvider } from './context/ProductsContext';
import AdminDashboard from './components/AdminDashboard';
import AiAssistant from './components/AiAssistant';

function AppContent() {
  const { isAdmin } = useAuth();
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [theme, setTheme] = useState<'emerald' | 'midnight'>('emerald');
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Hidden admin shortcut: Ctrl+Shift+A (only triggers if the logged-in user is actually an admin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        if (isAdmin) {
          setIsAdminMode(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin]);

  // Restructure to enforce Admin role check
  if (isAdminMode && isAdmin) {
    return <AdminDashboard onExit={() => setIsAdminMode(false)} />;
  }

  return (
    <div className={`relative min-h-screen selection:bg-teal-500/30 selection:text-white transition-colors duration-1000 ${theme === 'emerald' ? 'bg-emerald-950' : 'bg-slate-950'}`}>
      <ScrollProgress />
      <CartDrawer />
      <OrderStatusModal isOpen={isOrderStatusOpen} onClose={() => setIsOrderStatusOpen(false)} />
      <CheckoutModal />
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        onOpenAdmin={isAdmin ? () => setIsAdminMode(true) : undefined} 
      />
      
      {/* Background Liquid Glass Blobs/Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Top left blob */}
        <div className={`blob w-[600px] h-[600px] -top-[200px] -left-[200px] transition-colors duration-1000 ${theme === 'emerald' ? 'bg-teal-600/20' : 'bg-blue-600/20'}`}></div>
        {/* Top right blob */}
        <div className={`blob w-[800px] h-[800px] -top-[300px] -right-[200px] transition-colors duration-1000 ${theme === 'emerald' ? 'bg-emerald-500/20' : 'bg-indigo-500/20'}`} style={{ animationDelay: '-5s' }}></div>
        {/* Bottom right blob */}
        <div className={`blob w-[700px] h-[700px] top-[40%] -right-[300px] transition-colors duration-1000 ${theme === 'emerald' ? 'bg-blue-600/10' : 'bg-violet-600/10'}`} style={{ animationDelay: '-10s' }}></div>
        {/* Center left glow */}
        <div className={`blob w-[500px] h-[500px] top-[60%] -left-[200px] transition-colors duration-1000 ${theme === 'emerald' ? 'bg-yellow-500/5' : 'bg-sky-500/10'}`} style={{ animationDelay: '-15s' }}></div>
        {/* Global heavy grain overlay to give that premium matte texture under glass */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      <Navbar onOpenProfile={() => setIsProfileOpen(true)} />
      
      <main className="relative z-10 flex flex-col overflow-hidden pt-4">
        <Hero />
        <div className="w-full max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-8"></div>
        <ProductGrid />
        <div className="w-full max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>
        <FabricTech />
        <div className="w-full max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>
        <OurStory />
        <div className="w-full max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>
        <Testimonials />
        <div className="w-full max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>
        <FAQ />
        <div className="w-full max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>
        <Contact />
      </main>

      <Footer onOpenOrderStatus={() => setIsOrderStatusOpen(true)} theme={theme} setTheme={setTheme} />
      <BackToTop />
      <AiAssistant />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ProductsProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </ProductsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
