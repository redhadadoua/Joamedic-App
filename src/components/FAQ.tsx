import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function FAQ() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: 'faq.q1', a: 'faq.a1' },
    { q: 'faq.q2', a: 'faq.a2' },
    { q: 'faq.q3', a: 'faq.a3' },
    { q: 'faq.q4', a: 'faq.a4' },
  ];

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 px-6 relative z-10 w-full max-w-3xl mx-auto">
      <div className="flex flex-col items-center mb-12 text-center">
        <h2 className="text-sm font-medium text-teal-400 tracking-widest uppercase mb-2">{t('faq.tag')}</h2>
        <h3 className="font-display text-4xl font-bold text-white tracking-tight">{t('faq.title')}</h3>
      </div>

      <div className="flex flex-col gap-4">
        {faqs.map((faq, index) => (
          <div 
            key={index} 
            className="glass-panel overflow-hidden transition-all duration-300"
          >
            <button
              onClick={() => toggleAccordion(index)}
              className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
            >
              <span className="text-lg font-medium text-white/90">{t(faq.q)}</span>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="w-8 h-8 rounded-full bg-white/5 flex flex-shrink-0 items-center justify-center text-teal-300 ml-4 group-hover:bg-white/10"
              >
                <ChevronDown size={18} />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0 text-white/60 leading-relaxed">
                    {t(faq.a)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
