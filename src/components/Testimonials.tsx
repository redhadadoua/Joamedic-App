import { motion, AnimatePresence } from 'motion/react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const testimonials = [
  {
    id: 1,
    name: "Dr. Sarah Jenkins",
    role: "Chief of Surgery",
    quote: "I've worn dozens of brands over my 15-year career. Joamedic's Liquid Glass fabric is the only one that feels the same at hour 14 as it did at hour 1. Absolutely revolutionary comfort and mobility.",
    rating: 5,
  },
  {
    id: 2,
    name: "Michael Torres, RN",
    role: "ER Nurse",
    quote: "The fluid resistance is no joke. I've had countless spills in the ER, and these scrubs simply repel it all. Plus, they look so incredibly sleek, I constantly get asked where I got them.",
    rating: 5,
  },
  {
    id: 3,
    name: "Dr. Emily Chen",
    role: "Pediatrician",
    quote: "Finally, medical apparel that doesn't feel like a compromise. The stretch is phenomenal, the styling is elegant, and they emerge from the wash looking pristine every single time.",
    rating: 5,
  },
  {
    id: 4,
    name: "James Wilson",
    role: "Dental Surgeon",
    quote: "The attention to detail is remarkable. From the tailored fit to the perfectly placed hidden pockets, Joamedic has thought of everything. Worth every penny for the quality.",
    rating: 5,
  }
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const { t } = useLanguage();

  const nextTestimonial = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      nextTestimonial();
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 100 : -100,
        opacity: 0
      };
    },
    center: {
      z: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        z: 0,
        x: direction < 0 ? 100 : -100,
        opacity: 0
      };
    }
  };

  return (
    <section className="py-24 px-6 relative z-10 w-full max-w-7xl mx-auto overflow-hidden">
      <div className="flex flex-col items-center mb-16 text-center">
        <h2 className="text-sm font-medium text-teal-400 tracking-widest uppercase mb-2">{t('test.tag')}</h2>
        <h3 className="font-display text-4xl font-bold text-white tracking-tight">{t('test.title')}</h3>
      </div>

      <div className="relative max-w-4xl mx-auto h-[400px] sm:h-[350px] md:h-[300px]">
        {/* Navigation Buttons */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 md:-left-12 z-20 flex justify-center w-full md:w-auto md:block pointer-events-none">
          <button 
            onClick={prevTestimonial}
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-0 w-12 h-12 rounded-full glass-panel items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors pointer-events-auto button-prev"
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-0 md:-right-12 z-20 flex justify-center w-full md:w-auto md:block pointer-events-none">
          <button 
            onClick={nextTestimonial}
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 w-12 h-12 rounded-full glass-panel items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors pointer-events-auto button-next"
            aria-label="Next testimonial"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="relative w-full h-full overflow-hidden flex items-center justify-center px-4 md:px-0">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="absolute w-full px-4 md:px-8"
            >
              <div className="glass-card p-8 md:p-12 relative">
                <Quote className="absolute top-6 left-6 text-teal-500/20 w-16 h-16 transform -scale-x-100" />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="flex gap-1 mb-6">
                    {[...Array( testimonials[currentIndex].rating )].map((_, i) => (
                      <Star key={i} size={20} className="fill-gold-400 text-gold-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    ))}
                  </div>
                  
                  <p className="text-lg md:text-2xl text-white/90 font-light leading-relaxed mb-8 italic">
                    "{t(`test.${testimonials[currentIndex].id}.quote`) || testimonials[currentIndex].quote}"
                  </p>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-800/50 border border-teal-400/30 flex items-center justify-center mb-3 text-teal-300 font-semibold text-lg">
                      {(t(`test.${testimonials[currentIndex].id}.name`) || testimonials[currentIndex].name).charAt(0)}
                    </div>
                    <h4 className="font-semibold text-white text-lg">{t(`test.${testimonials[currentIndex].id}.name`) || testimonials[currentIndex].name}</h4>
                    <p className="text-teal-400/80 text-sm mt-1">{t(`test.${testimonials[currentIndex].id}.role`) || testimonials[currentIndex].role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Navigation controls */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 flex justify-center gap-6 z-20 pb-4">
            <button 
              onClick={prevTestimonial}
              className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors pointer-events-auto"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextTestimonial}
              className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors pointer-events-auto"
            >
              <ChevronRight size={20} />
            </button>
        </div>
      </div>
      
      {/* Pagination indicators */}
      <div className="flex justify-center gap-3 mt-8">
        {testimonials.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              setDirection(idx > currentIndex ? 1 : -1);
              setCurrentIndex(idx);
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'bg-teal-400 w-8 shadow-[0_0_10px_rgba(45,212,191,0.6)]' : 'bg-white/20'
            }`}
            aria-label={`Go to testimonial ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
