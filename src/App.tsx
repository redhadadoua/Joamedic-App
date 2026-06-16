/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import { LanguageProvider } from './i18n/LanguageContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductsProvider } from './context/ProductsContext';
import { Loader } from 'lucide-react';

const ProductGrid = lazy(() => import('./components/ProductGrid'));
const FabricTech = lazy(() => import('./components/FabricTech'));
const OurStory = lazy(() => import('./components/OurStory'));
const Contact = lazy(() => import('./components/Contact'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const Footer = lazy(() => import('./components/Footer'));
const CartDrawer = lazy(() => import('./components/CartDrawer'));
const ScrollProgress = lazy(() => import('./components/ScrollProgress'));
const OrderStatusModal = lazy(() => import('./components/OrderStatusModal'));
const CheckoutModal = lazy(() => import('./components/CheckoutModal'));
const BackToTop = lazy(() => import('./components/BackToTop'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));

// Modern, sleek loading fallback
const PageLoader = () => (
  <div className="w-full py-32 flex flex-col items-center justify-center gap-4 text-white/50">
    <Loader className="animate-spin text-teal-400" size={32} />
    <span className="text-sm tracking-widest uppercase font-mono">Loading Section...</span>
  </div>
);

function AppContent() {
  const { isAdmin } = useAuth();
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const theme = 'emerald';
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
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminDashboard onExit={() => setIsAdminMode(false)} />
      </Suspense>
    );
  }

  return (
    <div className="relative min-h-screen selection:bg-teal-500/30 selection:text-white">
      <Suspense fallback={null}>
        <ScrollProgress />
        <CartDrawer />
        <OrderStatusModal isOpen={isOrderStatusOpen} onClose={() => setIsOrderStatusOpen(false)} />
        <CheckoutModal />
        <ProfileModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
          onOpenAdmin={isAdmin ? () => setIsAdminMode(true) : undefined} 
        />
      </Suspense>
      
      {/* Background Liquid Glass Blobs/Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Top left blob */}
        <div className="blob w-[600px] h-[600px] -top-[200px] -left-[200px] bg-teal-600/20"></div>
        {/* Top right blob */}
        <div className="blob w-[800px] h-[800px] -top-[300px] -right-[200px] bg-emerald-500/20" style={{ animationDelay: '-5s' }}></div>
        {/* Bottom right blob */}
        <div className="blob w-[700px] h-[700px] top-[40%] -right-[300px] bg-teal-500/10" style={{ animationDelay: '-10s' }}></div>
        {/* Center left glow */}
        <div className="blob w-[500px] h-[500px] top-[60%] -left-[200px] bg-emerald-400/5" style={{ animationDelay: '-15s' }}></div>
        {/* Global heavy grain overlay to give that premium matte texture under glass */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      <Navbar onOpenProfile={() => setIsProfileOpen(true)} />
      
      <main className="relative z-10 flex flex-col overflow-hidden pt-4">
        <Hero />
        <div className="w-full max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-8"></div>
        <Suspense fallback={<PageLoader />}>
          <ProductGrid />
          <div className="w-full max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>
          <FabricTech />
          <div className="w-full max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>
          <OurStory />
          <div className="w-full max-w-7xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>
          <Contact />
        </Suspense>
      </main>

      <Suspense fallback={<PageLoader />}>
        <Footer onOpenOrderStatus={() => setIsOrderStatusOpen(true)} theme={theme} />
        <BackToTop />
      </Suspense>
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
