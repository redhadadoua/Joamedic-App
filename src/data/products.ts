import { Product } from '../context/CartContext';
import img011 from '../assets/images/011.jpg';
import img012 from '../assets/images/012.jpg';
import img013 from '../assets/images/013.jpg';
import imgSami10 from '../assets/images/sami 10.jpg';
import imgSami10sc from '../assets/images/sami 10sc.jpg';
import imgSami11 from '../assets/images/sami 11.jpeg';
import imgSamiSdqc from '../assets/images/sami sdqc.jpg';

export const products: Product[] = [
  {
    id: 1,
    name: "Sami 10 Classic Blue",
    category: "Premium Scrubs",
    price: "3700 DA",
    image: imgSami10,
    color: "Classic Blue",
    specs: ["4-Way Stretch Yarn", "Antibacterial Finish", "Reinforced Seams", "Moisture-Wicking"],
    description: "Our signature high-performance scrub set designed for maximum ease and fluid resistance during long clinical shifts."
  },
  {
    id: 2,
    name: "Sami 10sc Athletic Slim",
    category: "Slim-Fit Scrubs",
    price: "3700 DA",
    image: imgSami10sc,
    color: "Steel Teal",
    specs: ["Athletic Comfort Slits", "Stain Repellent technology", "Wrinkle-Resistant weave", "Hidden badge hanger"],
    description: "Engineered specifically for fast-paced professional workflows. Experience breathable, sports-grade flex panels."
  },
  {
    id: 3,
    name: "Sami 11 Ultra Care",
    category: "Women's Scrubs",
    price: "3700 DA",
    image: imgSami11,
    color: "Orchid Violet",
    specs: ["Ultra-Soft Yoga waistband", "6-Pocket storage array", "Zinc-Ion antimicrobial fabric", "Fade-Proof dye"],
    description: "The ideal balance of luxury feel and dynamic storage. Engineered to resist extreme wash temperatures."
  },
  {
    id: 4,
    name: "Sami SDQC Professional Dress",
    category: "Clinical Suits",
    price: "3700 DA",
    image: imgSamiSdqc,
    color: "Surgical Emerald",
    specs: ["Deep side pockets", "Stain Barrier protection", "Triple-Lock flat seams", "Anti-dust coat"],
    description: "Standard surgery-grade uniform suited for clinical precision. Maximum fluid repellence and durability."
  },
  {
    id: 5,
    name: "Joamedic Premium 013",
    category: "Men's Scrubs",
    price: "3700 DA",
    image: img013,
    color: "Charcoal Grey",
    specs: ["Heavy duty stitch-blend", "4 large tool pockets", "Odor-Lock active fibers", "Flexible V-Neck"],
    description: "Top tier reliability for demanding specialists. Offers a structured but completely flexible silhouette."
  },
  {
    id: 6,
    name: "Joamedic Lab Coat 012",
    category: "Lab Coats",
    price: "3700 DA",
    image: img012,
    color: "Classic White",
    specs: ["Optic stain guard", "Concealed inner storage", "Anti-Static thread blend", "Telescopic sleeves"],
    description: "Elegant, tailored doctor's lab coat. Infused with double nanotech fluid repellent for perfect hygiene."
  },
  {
    id: 7,
    name: "Joamedic Signature 011",
    category: "Exclusive Scrubs",
    price: "3700 DA",
    image: img011,
    color: "Desert Sand",
    specs: ["Premium organic cotton-blend", "Invisible zipper pockets", "Ventilation eyelets", "Dura-color guarantee"],
    description: "Limited edition luxury scrub set in earth tones. Heavy-duty construction with a featherlight cashmere touch."
  }
];
