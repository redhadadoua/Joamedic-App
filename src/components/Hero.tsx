import { ArrowRight, Activity, Droplet } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import heroImg1 from '../assets/images/sami sdqc.jpg';

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-12 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center z-10">
        
        {/* Left Content */}
        <div 
          className="flex flex-col gap-6 animate-slide-up opacity-0"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel w-fit border-teal-400/30">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-xs font-medium text-teal-300 tracking-wider uppercase">{t('hero.tag')}</span>
          </div>
          
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
            <span className="block pb-2">{t('hero.title1')}</span>
            {t('hero.title2') && (
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-white to-teal-100 text-glow py-2 mt-2 md:mt-0">
                {t('hero.title2')}
              </span>
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
        </div>

        {/* Right Content - Visual Showcase */}
        <div 
          className="relative h-[600px] w-full lg:ml-auto max-w-lg animate-scale-in opacity-0"
          style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
        >
          {/* Main Glass Container for Image */}
          <div className="absolute inset-0 glass-panel rounded-3xl overflow-hidden p-2">
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950/10">
              <img 
                src={heroImg1} 
                alt="Premium Surgeon Scrubs" 
                referrerPolicy="no-referrer"
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="absolute inset-0 object-cover w-full h-full animate-scale-in"
              />
            </div>
          </div>

          {/* Floating Feature Node 1 */}
          <div 
            className="absolute top-12 -left-6 glass-card p-4 flex items-center gap-3 w-48 animate-slide-up opacity-0"
            style={{ animationDelay: '1s', animationFillMode: 'forwards' }}
          >
            <div className="p-2 rounded-full bg-teal-400/20 border border-teal-400/30 text-teal-300">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t('hero.feature1.title')}</p>
              <p className="text-xs text-white/60">{t('hero.feature1.desc')}</p>
            </div>
          </div>

          {/* Floating Feature Node 2 */}
          <div 
            className="absolute bottom-24 -right-8 glass-card p-4 flex items-center gap-3 w-52 animate-slide-up opacity-0"
            style={{ animationDelay: '1.2s', animationFillMode: 'forwards' }}
          >
            <div className="p-2 rounded-full bg-blue-400/20 border border-blue-400/30 text-blue-300">
              <Droplet size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t('hero.feature2.title')}</p>
              <p className="text-xs text-white/60">{t('hero.feature2.desc')}</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
