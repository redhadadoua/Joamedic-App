import { Instagram, Twitter, Facebook, ArrowRight, Moon, Sun, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';

type FooterProps = {
  onOpenOrderStatus?: () => void;
  theme?: 'emerald' | 'midnight';
  setTheme?: (theme: 'emerald' | 'midnight') => void;
};

export default function Footer({ onOpenOrderStatus, theme = 'emerald', setTheme }: FooterProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubscribed) return;
    
    setIsSubmitting(true);
    // Simulate network request
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubscribed(true);
      
      // Reset after a few seconds
      setTimeout(() => {
        setIsSubscribed(false);
        setEmail('');
      }, 3000);
    }, 1500);
  };

  return (
    <footer className="relative z-10 w-full pt-16 pb-8 px-6 mt-12 overflow-hidden">
      <div className="absolute inset-0 block glass-panel w-full h-full -z-10 rounded-t-[3rem] border-b-0 border-x-0"></div>
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16 pt-8">
        {/* Brand Column */}
        <div className="flex flex-col gap-6">
          <Logo iconSize="sm" textSize="text-xl" />
          <p className="text-sm text-white/60 leading-relaxed max-w-xs">
            {t('foot.desc')}
          </p>
          <div className="flex items-center gap-4 mt-2">
            {[<Instagram size={18}/>, <Twitter size={18}/>, <Facebook size={18}/>].map((icon, i) => (
              <a key={i} href="#" className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Links Column 1 */}
        <div className="flex flex-col gap-4">
          <h4 className="font-semibold text-white mb-2">{t('foot.shop')}</h4>
          {['Men\'s Collections', 'Women\'s Collections', 'Lab Coats', 'Underscrubs', 'Gift Cards'].map(link => (
            <button 
              key={link} 
              onClick={(e) => {
                e.preventDefault();
                let category = 'All';
                if (link.includes("Men's")) {
                  category = "Men's Scrubs";
                } else if (link.includes("Women's")) {
                  category = "Women's Scrubs";
                } else if (link.includes("Lab")) {
                  category = "Women's Lab Coats";
                } else if (link.includes("Underscrubs")) {
                  category = "Unisex Scrubs";
                }
                window.dispatchEvent(new CustomEvent('filter-category', { detail: category }));
              }}
              className="text-sm text-white/50 hover:text-white transition-colors w-fit text-left cursor-pointer"
            >
              {link}
            </button>
          ))}
          <button 
            onClick={onOpenOrderStatus}
            className="text-sm text-white/50 hover:text-teal-300 transition-colors w-fit text-left flex flex-col group mt-2 cursor-pointer"
          >
            <span className="font-medium">{t('foot.orderStatus')}</span>
            <span className="h-0.5 w-0 bg-teal-400 group-hover:w-full transition-all duration-300 mt-0.5 rounded-full"></span>
          </button>
        </div>

        {/* Links Column 2 */}
        <div className="flex flex-col gap-4">
          <h4 className="font-semibold text-white mb-2">{t('foot.company')}</h4>
          {['Our Story', 'Fabric Technology', 'Sustainability', 'Careers', 'Contact Us'].map(link => (
            <button 
              key={link} 
              onClick={(e) => {
                e.preventDefault();
                let id = '';
                if (link === 'Our Story') {
                  id = 'our-story';
                } else if (link === 'Fabric Technology') {
                  id = 'fabric-tech';
                } else if (link === 'Sustainability') {
                  id = 'fabric-tech';
                } else if (link === 'Contact Us') {
                  id = 'contact';
                }
                if (id) {
                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-sm text-white/50 hover:text-white transition-colors w-fit text-left cursor-pointer"
            >
              {link}
            </button>
          ))}
        </div>

        {/* Newsletter Column */}
        <div className="flex flex-col gap-4">
          <h4 className="font-semibold text-white mb-2">{t('foot.newsletter.title')}</h4>
          <p className="text-sm text-white/50 mb-2">{t('foot.newsletter.desc')}</p>
          
          <form onSubmit={handleSubscribe} className="relative mt-2">
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting || isSubscribed}
              placeholder={t('foot.newsletter.placeholder')} 
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50 transition-colors disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={isSubmitting || isSubscribed || !email}
              className={`absolute right-1 top-1 bottom-1 w-10 border-0 rounded-full flex items-center justify-center text-white transition-all duration-500 overflow-hidden ${
                isSubscribed ? 'bg-teal-500 text-emerald-950 scale-100' : 
                isSubmitting ? 'glass-panel bg-white/10 opacity-70' : 
                'glass-panel bg-white/10 hover:bg-teal-500/40 disabled:opacity-50'
              }`}
            >
              <AnimatePresence mode="wait">
                {isSubscribed ? (
                  <motion.div
                    key="check"
                    initial={{ opacity: 0, scale: 0, rotate: -45 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Check size={16} strokeWidth={3} className="text-emerald-950" />
                  </motion.div>
                ) : isSubmitting ? (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  />
                ) : (
                  <motion.div
                    key="arrow"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArrowRight size={16} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} {t('foot.rights')}
        </p>
        <div className="flex items-center gap-6">
          {setTheme && (
            <button 
              onClick={() => setTheme(theme === 'emerald' ? 'midnight' : 'emerald')}
              className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
            >
              {theme === 'emerald' ? <Moon size={14} /> : <Sun size={14} />}
              {theme === 'emerald' ? 'Midnight Royal Theme' : 'Deep Emerald Theme'}
            </button>
          )}
          <a href="#" className="text-xs text-white/40 hover:text-white transition-colors">{t('foot.privacy')}</a>
          <a href="#" className="text-xs text-white/40 hover:text-white transition-colors">{t('foot.terms')}</a>
        </div>
      </div>
    </footer>
  );
}
