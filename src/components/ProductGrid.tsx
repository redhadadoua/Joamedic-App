import { ShoppingCart, CheckCircle2, Ruler } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCart } from '../context/CartContext';
import { products, colorOptions, sizeOptions, ColorOption } from '../data/products';
import SizeGuideModal from './SizeGuideModal';

const ProductImageZoom = ({ image, name }: { image: string, name: string }) => {
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: '50%', y: '50%' });

  const requestRef = React.useRef<number>();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only calculate position once per frame to prevent reflow bottlenecks
    if (requestRef.current) return;
    
    // Copy event values since React reuses the synthetic event object (in older React versions) or for closure safety
    const clientX = e.clientX;
    const clientY = e.clientY;
    const target = e.currentTarget;

    requestRef.current = requestAnimationFrame(() => {
      const { left, top, width, height } = target.getBoundingClientRect();
      const x = ((clientX - left) / width) * 100;
      const y = ((clientY - top) / height) * 100;
      setZoomPos({ x: `${x}%`, y: `${y}%` });
      requestRef.current = undefined;
    });
  };

  React.useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="relative aspect-[3/4] w-full rounded-2xl bg-white/5 overflow-hidden border border-white/10 cursor-zoom-in group shadow-2xl"
      onMouseEnter={() => setIsZooming(true)}
      onMouseLeave={() => setIsZooming(false)}
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 bg-emerald-990/10 mix-blend-overlay z-10 pointer-events-none"></div>
      <img 
        src={image} 
        alt={name} 
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition-transform duration-200 ease-out"
        style={{
          transformOrigin: `${zoomPos.x} ${zoomPos.y}`,
          transform: isZooming ? 'scale(1.8)' : 'scale(1)'
        }}
      />
    </div>
  );
};

export default function ProductGrid() {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  // Default flagship product
  const baseProduct = useMemo(() => products[0], []);

  // Selected Color and Size state
  const [selectedColor, setSelectedColor] = useState<ColorOption>(colorOptions[4]); // default to Royal Blue
  const [selectedSize, setSelectedSize] = useState<string>('M'); // default to M
  const [isAdded, setIsAdded] = useState(false);

  // Handle color change dynamically
  const selectColor = useCallback((color: ColorOption) => {
    setSelectedColor(color);
  }, []);

  // Composite product object incorporating selection
  const customizedProduct = useMemo(() => {
    return {
      ...baseProduct,
      image: selectedColor.image,
      color: selectedColor.nameAr // Set color in Arabic so it conforms and displays on order history
    };
  }, [baseProduct, selectedColor]);

  const handleAddToCart = () => {
    addToCart(customizedProduct, selectedSize);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  return (
    <section id="collections" className="py-24 px-6 relative z-10 w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-12 lg:gap-16 items-start">
        
        {/* Left Column: Media Showcase */}
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          <ProductImageZoom image={selectedColor.image} name={baseProduct.name} />
          
          {/* Saturated thumbnails */}
          <div className="grid grid-cols-6 gap-3">
            {colorOptions.map((opt) => {
              const isSelected = selectedColor.name === opt.name;
              return (
                <button
                  key={opt.name}
                  onClick={() => selectColor(opt)}
                  aria-label={`Select color ${opt.nameAr}`}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-slate-900 transition-all ${
                    isSelected 
                      ? 'border-teal-400 scale-105 shadow-[0_0_15px_rgba(45,212,191,0.35)]' 
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={opt.image} alt={opt.nameAr} loading="lazy" decoding="async" className="w-full h-full object-cover opacity-80" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Information & Options */}
        <div className="w-full md:w-1/2 flex flex-col justify-start">
          <div className="mb-3">
            <span className="text-xs font-semibold tracking-widest text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3.5 py-1.5 rounded-full uppercase">
              المجموعة الجديدة المميزة • Flagship Release
            </span>
          </div>

          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Joamedic Elite Scrubs
          </h1>

          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-teal-300">{baseProduct.price}</span>
            <span className="text-xs text-white/40 tracking-wider">شامل كلياً • COD Available</span>
          </div>

          <div className="h-[1px] w-full bg-gradient-to-r from-white/10 to-transparent mb-6"></div>

          <p className="text-white/80 leading-relaxed text-base mb-8 font-sans">
            {baseProduct.description}
          </p>

          {/* Color Selector */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-white tracking-wider">اللون المختار :</span>
              <span className="text-sm font-bold text-teal-300">{selectedColor.nameAr} ({selectedColor.name})</span>
            </div>
            
            <div className="flex gap-3 flex-wrap">
              {colorOptions.map((opt) => {
                const isSelected = selectedColor.name === opt.name;
                return (
                  <button
                    key={opt.name}
                    onClick={() => selectColor(opt)}
                    aria-label={`Select color ${opt.nameAr}`}
                    className={`relative w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center p-0.5 ${
                      isSelected 
                        ? 'border-teal-400 scale-110 shadow-[0_0_12px_rgba(45,212,191,0.4)]' 
                        : 'border-white/10 hover:scale-105'
                    }`}
                    title={opt.nameAr}
                  >
                    <div className={`w-full h-full rounded-full ${opt.colorClass}`} />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sizing Selector */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-white tracking-wider">المقاس المطلوب :</h2>
              <button 
                onClick={() => setIsSizeGuideOpen(true)}
                className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors"
              >
                <Ruler size={14} />
                {t('grid.sizeGuide')}
              </button>
            </div>
            
            <div className="flex gap-3">
              {sizeOptions.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  aria-label={`Select size ${size}`}
                  className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center text-sm font-bold transition-all ${
                    selectedSize === size 
                      ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.25)] scale-105' 
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span>{size}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="mb-10">
            <button 
              onClick={handleAddToCart}
              className={`w-full py-4.5 rounded-2xl font-bold tracking-wider transition-all flex items-center justify-center gap-3.5 shadow-lg border focus:outline-none ${
                isAdded 
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'bg-teal-500/20 border-teal-400/40 hover:bg-teal-500/30 text-white shadow-[0_0_20px_rgba(45,212,191,0.15)]'
              }`}
            >
              <ShoppingCart size={20} className={isAdded ? "text-emerald-300" : "text-teal-300"} />
              <span className="text-base">
                {isAdded ? 'تمت الإضافة للمشتروات!' : `${t('grid.buy')} - ${baseProduct.price}`}
              </span>
            </button>
          </div>

          {/* Impeccable Specs */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="text-xs font-bold text-white/50 mb-4 uppercase tracking-wider">ميزات النسيج النخبوي • Fabric Specifications</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {baseProduct.specs?.map((spec, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                  <CheckCircle2 size={16} className="text-teal-400 flex-shrink-0" />
                  <span>{spec}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
      
      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </section>
  );
}
