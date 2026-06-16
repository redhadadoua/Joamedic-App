import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Small throttle/requestAnimationFrame could be used here, but simple boolean check is fast enough
      if (window.scrollY > window.innerHeight * 0.8) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 z-50 p-4 glass-panel bg-white/5 hover:bg-teal-500/20 border border-white/10 rounded-full text-teal-300 hover:text-white transition-all duration-300 ease-out shadow-xl group focus:outline-none focus:ring-2 focus:ring-teal-400/50 ${
        isVisible ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-10 invisible'
      }`}
      aria-label="Back to top"
    >
      <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform" />
    </button>
  );
}
