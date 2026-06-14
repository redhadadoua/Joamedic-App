import { Product } from '../context/CartContext';
import imgEmeraldTop from '../assets/images/emerald_scrub_top_1781143320435.png';
import imgWhiteCoat from '../assets/images/white_lab_coat_1781143334662.png';
import imgNavyPants from '../assets/images/navy_scrub_pants_1781143346900.png';
import imgGreyTop from '../assets/images/grey_scrub_top_1781143357181.png';

export const products: Product[] = [
  {
    id: 1,
    name: "The Quantum Scrub Top",
    category: "Men's Scrubs",
    price: "3700 DA",
    image: imgEmeraldTop,
    color: "Deep Emerald",
    specs: ["4-Way Stretch", "Liquid Glass Fabric", "Antimicrobial", "Moisture Wicking"],
    description: "Engineered for maximum mobility and endurance. Features our signature 3-pocket setup and hidden badge loop."
  },
  {
    id: 2,
    name: "Aura Premium Lab Coat",
    category: "Women's Lab Coats",
    price: "3700 DA",
    image: imgWhiteCoat,
    color: "Radiant White",
    specs: ["Stain Repellent", "Wrinkle Resistant", "Customized Fit", "Hidden Inner Pockets"],
    description: "The modern lab coat redefined. Tailored for a sleek silhouette while offering uncompromising functionality and fluid resistance."
  },
  {
    id: 3,
    name: "Velocity Scrub Pants",
    category: "Women's Scrubs",
    price: "3700 DA",
    image: imgNavyPants,
    color: "Royal Navy",
    specs: ["Yoga Waistband", "7-Pocket Design", "Tapered Leg", "Liquid-Silk Feel"],
    description: "Experience the perfect balance of athletic performance and professional styling. Unprecedented comfort for 12+ hour shifts."
  },
  {
    id: 4,
    name: "Nova Comfort Top",
    category: "Unisex Scrubs",
    price: "3700 DA",
    image: imgGreyTop,
    color: "Slate Grey",
    specs: ["Ultra Breathable", "V-Neck Design", "Fade Resistant", "Eco-Friendly Dyes"],
    description: "Our most versatile top. Designed to provide a polished look with maximum airflow and unrestricted movement."
  }
];

