import { motion } from 'motion/react';
import { ArrowRight, Activity, Droplet } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import heroImg1 from '../assets/images/sami sdqc.jpg';

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-12 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center z-10">
        
        {/* Left Content */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col gap-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel w-fit border-teal-400/30">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-xs font-medium text-teal-300 tracking-wider uppercase">{t('hero.tag')}</span>
          </div>
          
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
            {t('hero.title1')}
            {t('hero.title2') && (
              <>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-white to-teal-100 text-glow">
                  {t('hero.title2')}
                </span>
              </>
            )}
          </h1>
          
          <p className="text-lg md:text-xl text-white/70 max-w-xl font-light leading-relaxed">
            {t('hero.desc')}
          </p>
          
          <div className="flex flex-wrap gap-4 mt-4">
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('filter-category', { detail: 'All' }));
              }}
              className="glass-button shine-effect px-8 py-4 text-base flex items-center gap-2 bg-teal-500/20 border-teal-400/40 hover:bg-teal-500/30 cursor-pointer"
            >
              {t('hero.btn.explore')}
              <ArrowRight size={18} className="text-teal-300" />
            </button>
            <button 
              onClick={() => {
                document.getElementById('our-story')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="glass-button px-8 py-4 text-base text-white/90 cursor-pointer"
            >
              {t('hero.btn.story')}
            </button>
          </div>
        </motion.div>

        {/* Right Content - Visual Showcase */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="relative h-[600px] w-full lg:ml-auto max-w-lg"
        >
          {/* Main Glass Container for Image */}
          <div className="absolute inset-0 glass-panel rounded-3xl overflow-hidden p-2">
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950/10">
              <motion.img 
                src={heroImg1} 
                alt="Premium Surgeon Scrubs" 
                referrerPolicy="no-referrer"
                fetchPriority="high"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 object-cover w-full h-full"
              />
            </div>
          </div>

          {/* Floating Feature Node 1 */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute top-12 -left-6 glass-card p-4 flex items-center gap-3 w-48"
          >
            <div className="p-2 rounded-full bg-teal-400/20 border border-teal-400/30 text-teal-300">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t('hero.feature1.title')}</p>
              <p className="text-xs text-white/60">{t('hero.feature1.desc')}</p>
            </div>
          </motion.div>

          {/* Floating Feature Node 2 */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="absolute bottom-24 -right-8 glass-card p-4 flex items-center gap-3 w-52"
          >
            <div className="p-2 rounded-full bg-blue-400/20 border border-blue-400/30 text-blue-300">
              <Droplet size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t('hero.feature2.title')}</p>
              <p className="text-xs text-white/60">{t('hero.feature2.desc')}</p>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
