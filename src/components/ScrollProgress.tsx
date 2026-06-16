import { useEffect, useState } from 'react';

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalScroll = document.documentElement.scrollTop;
          const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          const scroll = `${(totalScroll / windowHeight) * 100}%`;
          
          setProgress(Number((totalScroll / windowHeight) * 100));
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 w-full h-1 z-[100] bg-gradient-to-r from-teal-400 via-teal-300 to-emerald-300 origin-left opacity-90"
      style={{ 
        transform: `scaleX(${progress / 100})`,
        willChange: 'transform',
        boxShadow: '0 0 12px 2px rgba(45, 212, 191, 0.6), 0 0 24px rgba(45, 212, 191, 0.4)'
      }}
    />
  );
}
