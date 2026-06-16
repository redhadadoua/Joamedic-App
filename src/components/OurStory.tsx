import { useLanguage } from '../i18n/LanguageContext';
import storyImg from '../assets/images/DSC_0615 copie.webp';

export default function OurStory() {
  const { t } = useLanguage();

  return (
    <section id="our-story" className="py-32 px-6 relative z-10 w-full max-w-7xl mx-auto overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Images Column */}
        <div className="relative h-[600px] rounded-3xl overflow-hidden glass-panel border border-white/10 animate-fade-in opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="absolute inset-0 bg-emerald-900/20 mix-blend-overlay z-10"></div>
          <img 
            src={storyImg} 
            alt="Healthcare professionals" 
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-20"></div>
          <div className="absolute bottom-10 left-10 z-30">
            <div className="w-16 h-16 rounded-full glass-panel flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <p className="text-white font-mono text-sm tracking-widest uppercase">Est. 2024</p>
          </div>
        </div>

        {/* Text Column */}
        <div className="flex flex-col justify-center">
          <div className="animate-slide-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-[1px] w-12 bg-teal-400"></div>
              <span className="text-teal-400 uppercase tracking-widest text-sm font-semibold">{t('story.tag')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-semibold text-white tracking-tight mb-8">
              {t('story.title')}
            </h2>
            
            <div className="space-y-6 text-lg text-white/70">
              <p className="leading-relaxed">
                {t('story.desc1')}
              </p>
              <p className="leading-relaxed">
                {t('story.desc2')}
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
