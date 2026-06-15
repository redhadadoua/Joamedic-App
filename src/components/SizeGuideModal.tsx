import { motion, AnimatePresence } from 'motion/react';
import { X, Ruler } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type SizeGuideModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const sizeData = [
  { size: 'M', chest: '38-40', waist: '32-34', hips: '40-42' },
  { size: 'L', chest: '41-43', waist: '35-37', hips: '43-45' },
  { size: 'XL', chest: '44-46', waist: '38-40', hips: '46-48' },
];

export default function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl glass-panel p-8 shadow-2xl flex flex-col"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full glass-panel flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors z-10"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center">
                <Ruler size={20} />
              </div>
              <h2 className="text-2xl font-display font-semibold text-white tracking-tight">
                {t('sizeGuide.title')}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-4 px-4 text-xs font-semibold text-teal-400 uppercase tracking-wider">{t('sizeGuide.size')}</th>
                    <th className="py-4 px-4 text-xs font-semibold text-teal-400 uppercase tracking-wider">{t('sizeGuide.chest')}</th>
                    <th className="py-4 px-4 text-xs font-semibold text-teal-400 uppercase tracking-wider">{t('sizeGuide.waist')}</th>
                    <th className="py-4 px-4 text-xs font-semibold text-teal-400 uppercase tracking-wider">{t('sizeGuide.hips')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeData.map((row, index) => (
                    <tr 
                      key={row.size} 
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${index === sizeData.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="py-4 px-4 text-sm font-medium text-white">{row.size}</td>
                      <td className="py-4 px-4 text-sm text-white/70">{row.chest}</td>
                      <td className="py-4 px-4 text-sm text-white/70">{row.waist}</td>
                      <td className="py-4 px-4 text-sm text-white/70">{row.hips}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex gap-3 text-sm text-white/80 leading-relaxed">
              <div className="text-teal-300 flex-shrink-0 mt-0.5">ⓘ</div>
              <p>For the most accurate fit, we recommend measuring directly on your body. Our advanced Liquid Glass Fabric provides a 4-way stretch that adapts to your movements while maintaining structure.</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
