import { ShoppingCart, Menu, X, Globe, Search, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductsContext';
import Logo from './Logo';

export default function Navbar({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { language, toggleLanguage, t } = useLanguage();
  const { cartCount, setIsCartOpen, addToCart } = useCart();
  const { user, userProfile } = useAuth();
  const { products } = useProducts();

  useEffect(() => {
    const handleProductModalToggle = (e: any) => {
      setIsProductModalOpen(e.detail);
    };
    window.addEventListener('product-modal-toggle', handleProductModalToggle);
    return () => window.removeEventListener('product-modal-toggle', handleProductModalToggle);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 4)
    : [];

  const navItems = [
    { key: 'nav.collections', href: '#collections' },
    { key: 'nav.fabric', href: '#fabric-tech' },
    { key: 'nav.story', href: '#our-story' }
  ];

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-transform duration-300 ${isProductModalOpen ? '-translate-y-full md:translate-y-0' : 'translate-y-0'}`}
    >
      <div className="max-w-7xl mx-auto glass-panel rounded-full px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Logo iconSize="md" textSize="text-xl" />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a 
              key={item.href} 
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                if (item.href === '#collections') {
                  window.dispatchEvent(new CustomEvent('filter-category', { detail: 'All' }));
                } else {
                  document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-white/80 hover:text-white text-sm font-medium transition-colors hover:text-glow cursor-pointer"
            >
              {t(item.key)}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <div className="relative group" ref={searchRef}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-teal-400 transition-colors pointer-events-none z-10">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder={t('nav.search') || 'Search...'} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50 focus:bg-white/10 transition-all w-48 xl:w-56 focus:w-64"
            />
            <AnimatePresence>
              {isSearchFocused && searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-4 w-[350px] glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-50 flex flex-col"
                >
                  <div className="p-4 border-b border-white/10 bg-black/20">
                    <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Search Results</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map(product => (
                        <div key={product.id} className="flex gap-4 p-4 hover:bg-white/5 border-b border-white/5 transition-colors cursor-pointer group">
                          <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded-md opacity-80 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1 flex flex-col justify-center">
                            <h4 className="text-sm font-medium text-white group-hover:text-teal-300 transition-colors">{product.name}</h4>
                            <p className="text-xs text-white/50">{product.category}</p>
                          </div>
                          <button 
                            className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-teal-500/40 mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                              setIsSearchFocused(false);
                              setSearchQuery('');
                            }}
                          >
                            <ShoppingCart size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-white/50 text-sm">
                        No products found matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>



          <button 
            className="p-1 text-white/80 hover:text-white transition-colors relative" 
            aria-label="Profile"
            onClick={onOpenProfile}
          >
            {user ? (
              userProfile?.photoURL ? (
                <img 
                  src={userProfile.photoURL} 
                  alt={userProfile.displayName || 'Profile'} 
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border-2 border-teal-400/50 shadow-[0_0_8px_rgba(45,212,191,0.3)] hover:border-teal-400 transition-colors"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs uppercase border border-teal-400/30">
                  {user.email?.charAt(0) || <User size={16} />}
                </div>
              )
            ) : (
              <User size={20} />
            )}
          </button>
          
          <button 
            className="p-2 text-white/80 hover:text-white transition-colors relative" 
            aria-label="Cart"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-teal-400 text-emerald-950 text-[10px] font-bold rounded-full flex items-center justify-center translate-x-1 -translate-y-1">
                {cartCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('filter-category', { detail: 'All' }));
            }}
            className="glass-button shine-effect px-6 py-2 text-sm text-white cursor-pointer"
          >
            {t('nav.shop')}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-white/80 hover:text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="md:hidden mt-4 glass-panel rounded-2xl p-6 flex flex-col gap-4 mx-auto max-w-7xl relative"
          >
            <div className="relative mb-2">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none z-10">
                <Search size={16} />
              </div>
              <input 
                type="text" 
                placeholder={t('nav.search') || 'Search...'} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50 focus:bg-white/10 transition-all w-full"
              />
              {searchQuery && (
                <div className="mt-2 flex flex-col gap-2 max-h-60 overflow-y-auto bg-black/20 rounded-xl p-2 border border-white/5">
                   {searchResults.length > 0 ? (
                      searchResults.map(product => (
                        <div key={product.id} className="flex gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer items-center">
                          <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded-md opacity-80" />
                          <div className="flex-1 flex flex-col justify-center">
                            <h4 className="text-xs font-medium text-white">{product.name}</h4>
                          </div>
                          <button 
                            className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center hover:bg-teal-500/40"
                            onClick={() => {
                              addToCart(product);
                              setSearchQuery('');
                              setIsOpen(false);
                            }}
                          >
                            <ShoppingCart size={12} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-white/50 text-xs">
                        No products found matching "{searchQuery}"
                      </div>
                    )}
                </div>
              )}
            </div>

            {!searchQuery && navItems.map((item) => (
              <a 
                key={item.href} 
                href={item.href}
                className="text-white/80 hover:text-white text-lg font-medium py-2 border-b border-white/10 cursor-pointer animate-none"
                onClick={(e) => {
                  e.preventDefault();
                  setIsOpen(false);
                  if (item.href === '#collections') {
                    window.dispatchEvent(new CustomEvent('filter-category', { detail: 'All' }));
                  } else {
                    document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {t(item.key)}
              </a>
            ))}
            {!searchQuery && (
              <>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-6 justify-center w-full">
                    <button 
                      onClick={() => { onOpenProfile?.(); setIsOpen(false); }}
                      className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                    >
                      {user && userProfile?.photoURL ? (
                        <img 
                          src={userProfile.photoURL} 
                          alt="Profile" 
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-full object-cover border border-teal-400/50"
                        />
                      ) : (
                        <User size={20} />
                      )}
                      <span>{user ? (userProfile?.displayName || 'Profile') : 'Sign In'}</span>
                    </button>
                    <button 
                      onClick={() => { setIsCartOpen(true); setIsOpen(false); }}
                      className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                    >
                      <ShoppingCart size={20} />
                      <span>Cart ({cartCount})</span>
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    window.dispatchEvent(new CustomEvent('filter-category', { detail: 'All' }));
                  }}
                  className="glass-button shine-effect px-6 py-3 text-sm text-white mt-2 w-full cursor-pointer"
                >
                  {t('nav.shop')}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
