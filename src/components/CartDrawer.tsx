import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../i18n/LanguageContext';

const SIZES = ['M', 'L', 'XL'];

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, setIsCheckoutOpen, cartItems, removeFromCart, updateQuantity, updateSize, cartTotal } = useCart();
  const { t } = useLanguage();

  const handleCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm z-50 transition-opacity"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md glass-panel !rounded-none !border-y-0 !border-r-0 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
                <ShoppingBag size={20} className="text-teal-400" />
                {t('cart.title')}
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full glass-panel flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close cart"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/50 gap-4">
                  <ShoppingBag size={48} className="opacity-20" />
                  <p>{t('cart.empty')}</p>
                </div>
              ) : (
                cartItems.map((item, index) => (
                  <div key={`${item.id}-${item.color}-${item.size}-${index}`} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 relative">
                    <img src={item.image} alt={item.name} className="w-20 h-28 object-cover rounded-xl" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-white font-medium text-sm leading-tight pr-6">{t(`product.${item.id}.name`) || item.name}</h3>
                        <p className="text-white/60 text-xs mt-0.5">{item.color}</p>
                        <p className="text-teal-300 font-semibold mt-1">
                          {item.price}
                        </p>
                        
                        <div className="mt-2 flex items-center gap-2">
                          <label htmlFor={`size-${item.id}-${index}`} className="text-xs text-white/50">Size:</label>
                          <select 
                            id={`size-${item.id}-${index}`}
                            value={item.size || 'M'}
                            onChange={(e) => updateSize(item.id, e.target.value, item.size, item.color)}
                            className="bg-black/30 text-white text-xs py-1 px-2 rounded-md border border-white/10 focus:outline-none focus:border-teal-400/50 appearance-none cursor-pointer"
                          >
                            {SIZES.map(size => (
                              <option key={size} value={size} className="bg-emerald-950">{size}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 bg-black/20 rounded-full px-2 py-1 border border-white/10">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.size, undefined, item.color)} className="text-white/70 hover:text-white">
                            <Minus size={14} />
                          </button>
                          <span className="text-white text-sm w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.size, undefined, item.color)} className="text-white/70 hover:text-white">
                            <Plus size={14} />
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(item.id, item.size, undefined, item.color)} className="text-red-400/80 hover:text-red-300 p-1 transition-colors absolute top-4 right-4" aria-label={t('cart.remove')}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-white/10 bg-black/20">
              <div className="flex justify-between items-center mb-6">
                <span className="text-white/70">{t('cart.total')}</span>
                <span className="text-2xl font-semibold text-white">{cartTotal} DA</span>
              </div>
              <button 
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
                className="w-full glass-button shine-effect px-6 py-4 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-teal-500/20 border-teal-400/40 hover:bg-teal-500/30 flex justify-center"
              >
                {t('cart.checkout')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
