import { motion } from 'motion/react';
import { Shield, Wind, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const features = [
  {
    icon: <Wind size={28} />,
    titleKey: "fabric.f1.title",
    descKey: "fabric.f1.desc",
    benefitKey: "fabric.f1.benefit"
  },
  {
    icon: <Shield size={28} />,
    titleKey: "fabric.f2.title",
    descKey: "fabric.f2.desc",
    benefitKey: "fabric.f2.benefit"
  },
  {
    icon: <Sparkles size={28} />,
    titleKey: "fabric.f3.title",
    descKey: "fabric.f3.desc",
    benefitKey: "fabric.f3.benefit"
  }
];

export default function FabricTech() {
  const { t } = useLanguage();

  return (
    <section id="fabric-tech" className="py-24 px-6 relative z-10 w-full max-w-7xl mx-auto">
      <div className="glass-panel rounded-[2.5rem] p-8 md:p-16 overflow-hidden relative">
        {/* Background Decorative Elements within the glass panel */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="grid lg:grid-cols-2 gap-16 relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col justify-center"
          >
            <h2 className="text-sm font-medium text-teal-400 tracking-widest uppercase mb-4">{t('fabric.tag')}</h2>
            <h3 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-6">
              {t('fabric.title')}
            </h3>
            <p className="text-white/70 text-lg mb-8 leading-relaxed">
              {t('fabric.desc')}
            </p>
            <button className="glass-button shine-effect w-fit px-8 py-3 text-sm text-white border-white/30">
              {t('fabric.btn')}
            </button>
          </motion.div>

          <div className="flex flex-col gap-6">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="glass-card p-6 flex gap-6 items-start group"
              >
                <div className="shrink-0 p-4 rounded-2xl bg-white/5 border border-white/10 text-teal-300 group-hover:bg-teal-500/20 group-hover:border-teal-400/30 transition-colors duration-300 relative group/icon cursor-help">
                  {feature.icon}
                  {/* Tooltip */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 bg-emerald-900/95 backdrop-blur-md rounded-xl border border-white/20 opacity-0 group-hover/icon:opacity-100 group-hover/icon:-translate-y-1 transition-all duration-300 pointer-events-none whitespace-nowrap z-20 shadow-[0_0_15px_rgba(45,212,191,0.3)]">
                    <span className="text-xs font-medium text-white shadow-sm">{t(feature.benefitKey)}</span>
                    <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] bg-emerald-900/95 border-r border-b border-white/20 rotate-45"></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-white mb-2">{t(feature.titleKey)}</h4>
                  <p className="text-white/60 leading-relaxed text-sm">{t(feature.descKey)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
