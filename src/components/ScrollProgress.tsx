import { motion, useScroll, useSpring } from 'motion/react';

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 z-[100] bg-gradient-to-r from-teal-400 via-teal-300 to-emerald-300 origin-left opacity-90"
      style={{ 
        scaleX,
        boxShadow: '0 0 12px 2px rgba(45, 212, 191, 0.6), 0 0 24px rgba(45, 212, 191, 0.4)'
      }}
    />
  );
}
