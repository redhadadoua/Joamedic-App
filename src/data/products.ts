import { Product } from '../context/CartContext';
import img011 from '../assets/images/011.jpg';
import img012 from '../assets/images/012.jpg';
import img013 from '../assets/images/013.jpg';
import imgSami10 from '../assets/images/sami 10.jpg';
import imgSami10sc from '../assets/images/sami 10sc.jpg';
import imgSami11 from '../assets/images/sami 11.jpeg';

export const products: Product[] = [
  {
    id: 1,
    name: "Joamedic Elite Scrubs",
    category: "Premium Scrubs",
    price: "3700 DA",
    image: imgSami10, // default Royal Blue
    color: "Royal Blue",
    specs: [
      "تمدد فائق في 4 اتجاهات للحركة الحرة",
      "تصميم مقاوم للسوائل والبكتيريا والروائح",
      "خياطة متينة ومريحة ضد التحسس",
      "جيوب ذكية واسعة ومتعددة لتخزين الأدوات"
    ],
    description: "المجموعة الطبية المتكاملة والنخبوية للرعاية الصحية الفاخرة. صنعت خصيصاً لأدق الفترات الطبية والمناوبات الطويلة بمزيج من خيوط تمدد مرنة وتقنيات مضادة للمجاهر السائلة."
  }
];

export interface ColorOption {
  name: string;
  nameAr: string;
  image: string;
  colorClass: string;
}

export const colorOptions: ColorOption[] = [
  { name: 'White', nameAr: 'أبيض', image: img012, colorClass: 'bg-white border-white/20' },
  { name: 'Black', nameAr: 'أسود', image: img013, colorClass: 'bg-slate-950 border-white/20' },
  { name: 'Garent', nameAr: 'خمري (Garent)', image: imgSami11, colorClass: 'bg-red-800 border-white/20' },
  { name: 'Light Blue', nameAr: 'أزرق فاتح', image: imgSami10sc, colorClass: 'bg-sky-400 border-white/20' },
  { name: 'Royal Blue', nameAr: 'أزرق ملكي', image: imgSami10, colorClass: 'bg-blue-700 border-white/20' },
  { name: 'Grey', nameAr: 'رمادي', image: img011, colorClass: 'bg-neutral-500 border-white/20' }
];

export const sizeOptions = ['M', 'L', 'XL'];
