import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X, CheckCircle2, Ruler } from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCart, Product } from '../context/CartContext';
import { useProducts } from '../context/ProductsContext';
import SizeGuideModal from './SizeGuideModal';

const ProductImageZoom = ({ image, name }: { image: string, name: string }) => {
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: '50%', y: '50%' });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x: `${x}%`, y: `${y}%` });
  };

  return (
    <div 
      className="md:w-1/2 relative h-64 md:h-auto bg-black/10 overflow-hidden cursor-zoom-in flex-shrink-0"
      onMouseEnter={() => setIsZooming(true)}
      onMouseLeave={() => setIsZooming(false)}
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 bg-emerald-900/10 mix-blend-overlay z-10 pointer-events-none"></div>
      <img 
        src={image} 
        alt={name} 
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover transition-transform duration-200 ease-out"
        style={{
          transformOrigin: `${zoomPos.x} ${zoomPos.y}`,
          transform: isZooming ? 'scale(2)' : 'scale(1)'
        }}
      />
    </div>
  );
};

const ProductCard = React.memo(({ product, index, t, handleProductSelect, addToCart }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    whileHover={{ y: -8, scale: 1.02 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.5) }} // Cap delay
    className="group cursor-pointer"
    onClick={() => handleProductSelect(product)}
  >
    <motion.div 
      whileHover={{
        boxShadow: "0 20px 40px rgba(45,212,191,0.2)",
        borderColor: "rgba(45,212,191,0.3)"
      }}
      className="glass-card p-3 h-[400px] flex flex-col mb-4 relative overflow-hidden transition-all duration-300"
    >
      <div className="relative w-full h-[280px] rounded-xl overflow-hidden bg-white/5">
        <div className="absolute inset-0 bg-emerald-900/20 mix-blend-overlay z-10"></div>
        <img 
          src={product.image} 
          alt={product.name} 
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        
        <button 
          className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-teal-500/30 hover:text-teal-300"
          onClick={(e) => {
            e.stopPropagation(); // Avoid triggering the modal
            addToCart(product);
          }}
        >
          <ShoppingCart size={18} />
        </button>
      </div>
      
      <div className="mt-4 px-2 flex-grow flex flex-col justify-between">
        <div>
          <p className="text-xs text-white/50 mb-1">{t(`product.${product.id}.category`) || product.category}</p>
          <h4 className="text-white font-medium text-lg leading-tight group-hover:text-teal-300 transition-colors">
            {t(`product.${product.id}.name`) || product.name}
          </h4>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-white/70">{t(`product.${product.id}.color`) || product.color}</span>
          <span className="text-white font-semibold">{product.price}</span>
        </div>
      </div>
    </motion.div>
  </motion.div>
));

export default function ProductGrid() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  
  // Filtering & Collection State
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Personalization State
  const [selectedSize, setSelectedSize] = useState('M');
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [persText, setPersText] = useState('');
  const [persColor, setPersColor] = useState('White');
  const [persPlacement, setPersPlacement] = useState('Left Chest');

  const { t, language } = useLanguage();
  const { addToCart } = useCart();
  const { products, loading } = useProducts();

  const productsList = products || [];
  const categories: string[] = ['All', ...(Array.from(new Set(productsList.map(p => p.category).filter((cat: any) => cat && cat !== 'All'))) as string[])];
  
  const filteredProducts = selectedCategory === 'All'
    ? productsList
    : productsList.filter(p => p.category === selectedCategory);

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, Record<string, string>> = {
      'All': { EN: 'All Products', AR: 'الكل', FR: 'Tous les produits' },
      "Men's Scrubs": { EN: "Men's Scrubs", AR: 'ملابس طبية للرجال', FR: 'Scrubs Homme' },
      "Women's Scrubs": { EN: "Women's Scrubs", AR: 'ملابس طبية للنساء', FR: 'Scrubs Femme' },
      "Women's Lab Coats": { EN: "Women's Lab Coats", AR: 'معاطف مختبر نسائية', FR: 'Blouses Labo' },
      "Unisex Scrubs": { EN: "Unisex Scrubs", AR: 'ملابس طبية للجنسين', FR: 'Scrubs Unisexe' }
    };
    return labels[cat]?.[language] || cat;
  };

  useEffect(() => {
    const handleFilter = (e: Event) => {
      const cat = (e as CustomEvent).detail;
      if (typeof cat === 'string') {
        setSelectedCategory(cat);
        // Scroll to the collection section smoothly
        const el = document.getElementById('collections');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    window.addEventListener('filter-category', handleFilter as EventListener);
    return () => window.removeEventListener('filter-category', handleFilter as EventListener);
  }, []);
  
  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product);
    setSelectedSize('M');
    setIsPersonalizing(false);
    setPersText('');
    setPersColor('White');
    setPersPlacement('Left Chest');
    window.dispatchEvent(new CustomEvent('product-modal-toggle', { detail: true }));
  }, []);

  const closeProductModal = useCallback(() => {
    setSelectedProduct(null);
    window.dispatchEvent(new CustomEvent('product-modal-toggle', { detail: false }));
  }, []);

  return (
    <section id="collections" className="py-24 px-6 relative z-10 w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h2 className="text-sm font-medium text-teal-400 tracking-widest uppercase mb-2">{t('grid.tag')}</h2>
          <h3 className="font-display text-4xl font-bold text-white tracking-tight">{t('grid.title')}</h3>
        </div>
        <button 
          onClick={() => setSelectedCategory('All')}
          className="text-sm font-medium text-white/80 hover:text-white border-b border-white/20 hover:border-white transition-colors pb-1"
        >
          {t('grid.viewAll')}
        </button>
      </div>

      {/* Interactive Collection Filter Pills */}
      <div className="flex flex-wrap items-center gap-3 mb-10 pb-6 border-b border-white/10 relative z-20">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`relative px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                isActive
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-[0_0_15px_rgba(45,212,191,0.25)]'
                  : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20'
              }`}
            >
              {getCategoryLabel(cat)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="glass-card p-3 h-[400px] flex flex-col mb-4 animate-pulse">
              <div className="w-full h-[280px] rounded-xl bg-white/5"></div>
              <div className="mt-4 px-2 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3"></div>
                <div className="h-5 bg-white/25 rounded w-3/4"></div>
                <div className="flex justify-between items-center mt-4">
                  <div className="h-4 bg-white/15 rounded w-1/4"></div>
                  <div className="h-4 bg-white/20 rounded w-1/6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center text-white/50">
          No products found in this collection.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product, index) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              index={index} 
              t={t} 
              handleProductSelect={handleProductSelect} 
              addToCart={addToCart} 
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md"
              onClick={closeProductModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "tween", duration: 0.2 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-panel rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden"
            >
              <button 
                onClick={closeProductModal}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              <ProductImageZoom image={selectedProduct.image} name={selectedProduct.name} />

              <div className="md:w-1/2 p-8 md:p-10 flex flex-col bg-slate-900/90 md:backdrop-blur-xl">
                <div className="mb-2">
                  <span className="text-xs font-medium text-teal-400 tracking-widest uppercase">{t(`product.${selectedProduct.id}.category`) || selectedProduct.category}</span>
                </div>
                <h3 className="font-display text-3xl font-bold text-white mb-2">{t(`product.${selectedProduct.id}.name`) || selectedProduct.name}</h3>
                <p className="text-2xl font-light text-white/90 mb-6">{selectedProduct.price}</p>
                
                <p className="text-white/70 leading-relaxed mb-6 text-sm">
                  {t(`product.${selectedProduct.id}.desc`) || selectedProduct.description}
                </p>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider">{t('sizeGuide.size')}</h4>
                    <button 
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors"
                    >
                       <Ruler size={14} />
                       {t('grid.sizeGuide')}
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`w-10 h-10 rounded-lg border flex items-center justify-center text-sm font-medium transition-all ${
                          selectedSize === size 
                            ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.2)]' 
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox"
                        checked={isPersonalizing}
                        onChange={(e) => setIsPersonalizing(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 rounded border border-white/30 bg-black/20 peer-checked:bg-teal-500 peer-checked:border-teal-500 transition-all flex items-center justify-center">
                        <CheckCircle2 size={14} className={`text-white transition-transform ${isPersonalizing ? 'scale-100' : 'scale-0'}`} />
                      </div>
                    </div>
                    <span className="text-white text-sm font-medium">{t('personalize.title')}</span>
                  </label>

                  <AnimatePresence>
                    {isPersonalizing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden space-y-4"
                      >
                        <div>
                          <label className="block text-xs text-white/60 mb-1">{t('personalize.text')}</label>
                          <input 
                            type="text" 
                            maxLength={25}
                            value={persText}
                            onChange={(e) => setPersText(e.target.value)}
                            placeholder="Dr. Smith"
                            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-teal-400/50 transition-colors"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-white/60 mb-1">{t('personalize.color')}</label>
                            <select 
                              value={persColor}
                              onChange={(e) => setPersColor(e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-teal-400/50 transition-colors appearance-none"
                            >
                              <option className="bg-emerald-950 text-white" value="White">{t('personalize.color.white')}</option>
                              <option className="bg-emerald-950 text-white" value="Gold">{t('personalize.color.gold')}</option>
                              <option className="bg-emerald-950 text-white" value="Navy">{t('personalize.color.navy')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-white/60 mb-1">{t('personalize.placement')}</label>
                            <select 
                              value={persPlacement}
                              onChange={(e) => setPersPlacement(e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-teal-400/50 transition-colors appearance-none"
                            >
                              <option className="bg-emerald-950 text-white" value="Left Chest">{t('personalize.placement.left')}</option>
                              <option className="bg-emerald-950 text-white" value="Right Chest">{t('personalize.placement.right')}</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">{t('grid.specs')}</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedProduct.specs?.map((spec, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-white/70">
                        <CheckCircle2 size={14} className="text-teal-400" />
                        {t(`product.${selectedProduct.id}.spec.${i}`) || spec}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-auto pt-6 border-t border-white/10 flex items-center gap-4">
                  <button 
                    onClick={() => {
                      const personalization = isPersonalizing && persText.trim() ? {
                        text: persText,
                        color: persColor,
                        placement: persPlacement,
                        price: 370
                      } : undefined;
                      addToCart(selectedProduct, selectedSize, personalization);
                      closeProductModal();
                    }}
                    className="flex-1 glass-button shine-effect bg-teal-500/20 border-teal-400/40 hover:bg-teal-500/30 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(45,212,191,0.15)] focus:outline-none flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={18} className="text-teal-300" />
                    {t('grid.buy')} - { (parseFloat(selectedProduct.price.replace(/[^0-9.]/g, '')) + (isPersonalizing ? 370 : 0)) } DA
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </section>
  );
}
