// === Demo data — Wabi Sabi, The Oberoi · Bangalore, INR ===
const CATEGORIES = [
  { id: 'starters', name: 'Starters · 前菜', short: 'Zensai',  ico: '🍣', color: 'oklch(0.55 0.05 60)' },
  { id: 'mains',    name: 'Main Course · 主菜', short: 'Shusai', ico: '🍱', color: 'oklch(0.50 0.05 60)' },
  { id: 'desserts', name: 'Desserts · 甘味', short: 'Kanmi',  ico: '🍰', color: 'oklch(0.65 0.04 30)' },
  { id: 'drinks',   name: 'Drinks · 飲み物', short: 'Nomimono', ico: '🍵', color: 'oklch(0.55 0.05 100)' },
];

const MENU = [
  // Starters · 前菜 (Zensai)
  { id: 'za01', cat: 'starters', name: 'Edamame Yuzu Salt', desc: 'Steamed soybeans, citrus salt flakes', price: 420, swatch: '🟢' },
  { id: 'za02', cat: 'starters', name: 'Hamachi Crudo', desc: 'Yellowtail sashimi, ponzu, micro shiso', price: 980, swatch: '🍣', popular: true },
  { id: 'za03', cat: 'starters', name: 'Takoyaki (6pc)', desc: 'Octopus dumplings, bonito flakes, kewpie', price: 540, swatch: '🐙' },
  { id: 'za04', cat: 'starters', name: 'Wagyu Tataki', desc: 'A5 Wagyu, ponzu, crispy garlic chips', price: 1480, swatch: '🥩', popular: true },
  { id: 'za05', cat: 'starters', name: 'Ikura Tartare', desc: 'Salmon belly, salmon roe, quail egg yolk', price: 920, swatch: '🍥' },
  { id: 'za06', cat: 'starters', name: 'Agedashi Tofu', desc: 'Lightly-fried silken tofu, dashi broth', price: 480, swatch: '🍢' },
  { id: 'za07', cat: 'starters', name: 'Chawanmushi', desc: 'Savoury egg custard, dashi, prawn, gingko', price: 520, swatch: '🥚' },

  // Main Course · 主菜 (Shusai)
  { id: 'sh01', cat: 'mains', name: 'Otoro Omakase (5pc)', desc: 'Bluefin tuna belly nigiri, chef selection', price: 2480, swatch: '🍣', popular: true },
  { id: 'sh02', cat: 'mains', name: 'Chirashi Bowl', desc: 'Seven-fish sashimi over sushi rice', price: 1480, swatch: '🍱' },
  { id: 'sh03', cat: 'mains', name: 'A5 Wagyu Sukiyaki', desc: 'Imported A5, vegetables, raw egg dip', price: 3480, swatch: '🥩', popular: true },
  { id: 'sh04', cat: 'mains', name: 'Unagi Don', desc: 'Grilled freshwater eel, tare glaze, sansho', price: 1680, swatch: '🍱' },
  { id: 'sh05', cat: 'mains', name: 'Black Cod Saikyo', desc: '72hr miso-marinated cod, charred', price: 1980, swatch: '🐟' },
  { id: 'sh06', cat: 'mains', name: 'Tonkotsu Ramen', desc: '12hr pork bone broth, chashu, ajitama, nori', price: 680, swatch: '🍜', popular: true },
  { id: 'sh07', cat: 'mains', name: 'Spicy Miso Ramen', desc: 'Red miso, ground pork, scallion, chili oil', price: 620, swatch: '🍜' },
  { id: 'sh08', cat: 'mains', name: 'Ebi Tempura (5pc)', desc: 'Tiger prawns, tentsuyu sauce, daikon', price: 780, swatch: '🍤' },
  { id: 'sh09', cat: 'mains', name: 'Chicken Katsu Curry', desc: 'Panko cutlet, Japanese curry, rice', price: 720, swatch: '🍛' },
  { id: 'sh10', cat: 'mains', name: 'Salmon Teriyaki', desc: 'Glazed Norwegian salmon, sansho pepper', price: 1080, swatch: '🐟' },
  { id: 'sh11', cat: 'mains', name: 'Yakitori Platter', desc: 'Charcoal skewers — momo, tsukune, kawa', price: 820, swatch: '🍢' },

  // Desserts · 甘味 (Kanmi)
  { id: 'km01', cat: 'desserts', name: 'Matcha Tiramisu', desc: 'Mascarpone, matcha sponge, ceremonial dust', price: 420, swatch: '🍰', popular: true },
  { id: 'km02', cat: 'desserts', name: 'Mochi Ice Cream Trio', desc: 'Yuzu, matcha, black sesame', price: 380, swatch: '🍡' },
  { id: 'km03', cat: 'desserts', name: 'Yuzu Cheesecake', desc: 'Hokkaido cream cheese, citrus zest', price: 440, swatch: '🍰' },
  { id: 'km04', cat: 'desserts', name: 'Kuromitsu Anmitsu', desc: 'Agar jelly, red bean, brown sugar syrup', price: 360, swatch: '🍮' },
  { id: 'km05', cat: 'desserts', name: 'Black Sesame Brûlée', desc: 'Burnt sugar crust, kuromame, gold leaf', price: 460, swatch: '🍮' },

  // Drinks · 飲み物 (Nomimono)
  { id: 'nm01', cat: 'drinks', name: 'Hibiki 17 Whisky', desc: 'Suntory blend · 30ml', price: 2400, swatch: '🥃', popular: true },
  { id: 'nm02', cat: 'drinks', name: 'Junmai Daiginjo Sake', desc: 'Polished 50% · carafe', price: 1480, swatch: '🍶', popular: true },
  { id: 'nm03', cat: 'drinks', name: 'Yuzu Highball', desc: 'Toki whisky, fresh yuzu, soda', price: 520, swatch: '🥃' },
  { id: 'nm04', cat: 'drinks', name: 'Sakura Mojito', desc: 'Sakura syrup, white rum, lime, mint', price: 540, swatch: '🍸' },
  { id: 'nm05', cat: 'drinks', name: 'Iced Matcha Latte', desc: 'Ceremonial matcha, oat milk', price: 360, swatch: '🍵' },
  { id: 'nm06', cat: 'drinks', name: 'Hojicha', desc: 'Roasted green tea · pot', price: 240, swatch: '🍵' },
  { id: 'nm07', cat: 'drinks', name: 'Genmaicha', desc: 'Toasted-rice green tea · pot', price: 240, swatch: '🍵' },
  { id: 'nm08', cat: 'drinks', name: 'Asahi Super Dry', desc: '330ml', price: 420, swatch: '🍺' },
  { id: 'nm09', cat: 'drinks', name: 'Sapporo Premium', desc: '650ml', price: 540, swatch: '🍺' },
  { id: 'nm10', cat: 'drinks', name: 'Ramune Soda', desc: 'Original Japanese marble soda', price: 220, swatch: '🥤' },
];

// Modifier groups by category
const MOD_GROUPS = {
  starters: [
    { id: 'sauce', name: 'Sauce', required: false, multi: false, opts: [
      { id: 'ponzu', name: 'Ponzu', addPrice: 0 },
      { id: 'soy', name: 'Soy & Wasabi', addPrice: 0 },
      { id: 'mayo', name: 'Spicy Kewpie Mayo', addPrice: 0 },
    ]},
  ],
  mains: [
    { id: 'spice', name: 'Spice Level', required: false, multi: false, opts: [
      { id: 'mild', name: 'Mild', addPrice: 0 },
      { id: 'med', name: 'Medium', addPrice: 0 },
      { id: 'spicy', name: 'Spicy', addPrice: 0 },
      { id: 'extra', name: 'Extra Spicy 🔥', addPrice: 0 },
    ]},
    { id: 'rice', name: 'Rice', required: false, multi: false, opts: [
      { id: 'koshi', name: 'Koshihikari (default)', addPrice: 0 },
      { id: 'brown', name: 'Brown Rice', addPrice: 60 },
      { id: 'no-rice', name: 'No Rice', addPrice: -80 },
    ]},
    { id: 'add', name: 'Add-ons', required: false, multi: true, opts: [
      { id: 'ajitama', name: 'Extra Ajitama (egg)', addPrice: 80 },
      { id: 'chashu', name: 'Extra Chashu', addPrice: 180 },
      { id: 'nori', name: 'Extra Nori', addPrice: 40 },
      { id: 'corn', name: 'Sweet Corn', addPrice: 60 },
      { id: 'menma', name: 'Bamboo Shoots (menma)', addPrice: 60 },
    ]},
    { id: 'remove', name: 'Hold / Remove', required: false, multi: true, opts: [
      { id: 'no-onion', name: 'No Onion', addPrice: 0 },
      { id: 'no-garlic', name: 'No Garlic', addPrice: 0 },
      { id: 'no-egg', name: 'No Egg', addPrice: 0 },
    ]},
  ],
  drinks: [
    { id: 'temp', name: 'Temperature', required: false, multi: false, opts: [
      { id: 'cold', name: 'Cold (reishu)', addPrice: 0 },
      { id: 'warm', name: 'Warm (atsukan)', addPrice: 0 },
      { id: 'hot', name: 'Hot', addPrice: 0 },
    ]},
    { id: 'sweet', name: 'Sweetness', required: false, multi: false, opts: [
      { id: 'reg', name: 'Regular', addPrice: 0 },
      { id: 'less', name: 'Less Sugar', addPrice: 0 },
      { id: 'no', name: 'No Sugar', addPrice: 0 },
    ]},
    { id: 'opt', name: 'Options', required: false, multi: true, opts: [
      { id: 'noice', name: 'No Ice', addPrice: 0 },
      { id: 'extra-ice', name: 'Extra Ice', addPrice: 0 },
      { id: 'double', name: 'Make it a double', addPrice: 480 },
    ]},
  ],
};

// Tables — sections renamed Garden / Main Hall / Sake Bar / Tatami Room
const TABLES = [
  // Garden (庭)
  { id: 1, x: 60, y: 70, w: 80, h: 80, seats: 2, shape: 'round', section: 'Garden' },
  { id: 2, x: 170, y: 70, w: 80, h: 80, seats: 2, shape: 'round', section: 'Garden' },
  { id: 3, x: 280, y: 70, w: 100, h: 80, seats: 4, shape: 'rect', section: 'Garden' },
  { id: 4, x: 60, y: 180, w: 100, h: 80, seats: 4, shape: 'rect', section: 'Garden' },
  { id: 5, x: 200, y: 180, w: 180, h: 80, seats: 6, shape: 'rect', section: 'Garden' },

  // Main Hall (本店)
  { id: 10, x: 460, y: 70, w: 100, h: 100, seats: 4, shape: 'rect', section: 'Main' },
  { id: 11, x: 600, y: 70, w: 100, h: 100, seats: 4, shape: 'rect', section: 'Main' },
  { id: 12, x: 740, y: 70, w: 100, h: 100, seats: 4, shape: 'rect', section: 'Main' },
  { id: 13, x: 880, y: 70, w: 80, h: 80, seats: 2, shape: 'round', section: 'Main' },
  { id: 14, x: 460, y: 220, w: 100, h: 100, seats: 4, shape: 'rect', section: 'Main' },
  { id: 15, x: 600, y: 220, w: 100, h: 100, seats: 4, shape: 'rect', section: 'Main' },
  { id: 16, x: 740, y: 220, w: 100, h: 100, seats: 4, shape: 'rect', section: 'Main' },
  { id: 17, x: 880, y: 220, w: 80, h: 80, seats: 2, shape: 'round', section: 'Main' },
  { id: 18, x: 460, y: 380, w: 220, h: 80, seats: 8, shape: 'rect', section: 'Main' },
  { id: 19, x: 720, y: 380, w: 240, h: 80, seats: 8, shape: 'rect', section: 'Main' },

  // Sake Bar (酒)
  { id: 'B1', x: 60, y: 360, w: 60, h: 60, seats: 1, shape: 'round', section: 'Bar' },
  { id: 'B2', x: 140, y: 360, w: 60, h: 60, seats: 1, shape: 'round', section: 'Bar' },
  { id: 'B3', x: 220, y: 360, w: 60, h: 60, seats: 1, shape: 'round', section: 'Bar' },
  { id: 'B4', x: 300, y: 360, w: 60, h: 60, seats: 1, shape: 'round', section: 'Bar' },

  // Tatami Room (private)
  { id: 20, x: 60, y: 500, w: 380, h: 100, seats: 12, shape: 'rect', section: 'Tatami' },
];

const SECTION_FRAMES = [
  { name: 'Garden · 庭',     x: 30,  y: 30,  w: 400, h: 270 },
  { name: 'Main Hall · 本店', x: 440, y: 30,  w: 540, h: 470 },
  { name: 'Sake Bar · 酒',   x: 30,  y: 320, w: 400, h: 130 },
  { name: 'Tatami · 個室',    x: 30,  y: 470, w: 400, h: 150 },
];

const STAFF = [
  { id: 'u1', name: 'Yui T.',    role: 'Server',           initials: 'YT', pin: '1234' },
  { id: 'u2', name: 'Kenji M.',  role: 'Server',           initials: 'KM', pin: '2345' },
  { id: 'u3', name: 'Aiko S.',   role: 'Sake Sommelier',   initials: 'AS', pin: '3456' },
  { id: 'u4', name: 'Hiro N.',   role: 'Host',             initials: 'HN', pin: '4567' },
  { id: 'u5', name: 'Riku Y.',   role: 'Manager',          initials: 'RY', pin: '0000' },
  { id: 'u6', name: 'Mei K.',    role: 'Server',           initials: 'MK', pin: '5678' },
];

// === Menu enrichment ===
// Per-item data for the AR dish viewer + forecasting (ingredients, prep time,
// calories, spice 0-3, gradient for the hologram card).
// Gradient palette draws from Japanese aesthetics: vermilion (朱), indigo (藍),
// matcha (抹茶), gold leaf (金箔), sakura (桜), sumi (墨), washi (和紙).
const MENU_META = {
  // Starters · 前菜
  za01: { prep: 4,  cal: 180, spice: 0, vegetarian: true,  ingredients: ['Edamame', 'Yuzu zest', 'Sea salt'],                                gradient: 'linear-gradient(135deg,#c9e7a8 0%,#5e9a3a 60%,#1f3d10 100%)' },
  za02: { prep: 8,  cal: 220, spice: 0, vegetarian: false, ingredients: ['Yellowtail', 'Ponzu', 'Yuzu', 'Micro shiso', 'Sea salt'],          gradient: 'linear-gradient(135deg,#ffd0b8 0%,#d96e3a 60%,#5a1a08 100%)' },
  za03: { prep: 10, cal: 320, spice: 1, vegetarian: false, ingredients: ['Octopus', 'Tempura flour', 'Bonito flakes', 'Kewpie', 'Tonkatsu'], gradient: 'linear-gradient(135deg,#ffc296 0%,#c75a1c 60%,#3e1402 100%)' },
  za04: { prep: 8,  cal: 380, spice: 0, vegetarian: false, ingredients: ['Wagyu A5', 'Ponzu', 'Garlic chips', 'Sea salt', 'Chives'],         gradient: 'linear-gradient(135deg,#f8d2c4 0%,#a8351a 60%,#2a0606 100%)' },
  za05: { prep: 6,  cal: 290, spice: 0, vegetarian: false, ingredients: ['Salmon belly', 'Salmon roe', 'Quail egg', 'Soy', 'Sesame oil'],    gradient: 'linear-gradient(135deg,#ffba8a 0%,#e85a1c 60%,#5a1502 100%)' },
  za06: { prep: 7,  cal: 260, spice: 0, vegetarian: true,  ingredients: ['Silken tofu', 'Dashi', 'Soy', 'Mirin', 'Daikon'],                  gradient: 'linear-gradient(135deg,#fbe9c0 0%,#a17030 60%,#3a2008 100%)' },
  za07: { prep: 14, cal: 240, spice: 0, vegetarian: false, ingredients: ['Eggs', 'Dashi', 'Tiger prawns', 'Shiitake', 'Mirin'],              gradient: 'linear-gradient(135deg,#fff0c0 0%,#caa030 60%,#5a3804 100%)' },

  // Main Course · 主菜
  sh01: { prep: 16, cal: 540, spice: 0, vegetarian: false, ingredients: ['Bluefin otoro', 'Sushi rice', 'Wasabi', 'Soy', 'Nori'],            gradient: 'linear-gradient(135deg,#ffd2b6 0%,#d8442a 60%,#3a0808 100%)' },
  sh02: { prep: 14, cal: 620, spice: 0, vegetarian: false, ingredients: ['Tuna', 'Salmon', 'Yellowtail', 'Sushi rice', 'Salmon roe'],        gradient: 'linear-gradient(135deg,#ffc7a8 0%,#c5532a 60%,#451004 100%)' },
  sh03: { prep: 22, cal: 920, spice: 0, vegetarian: false, ingredients: ['Wagyu A5', 'Shiitake', 'Tofu', 'Bok choy', 'Egg', 'Mirin'],        gradient: 'linear-gradient(135deg,#f4c8b6 0%,#9c2812 60%,#1f0202 100%)' },
  sh04: { prep: 20, cal: 780, spice: 0, vegetarian: false, ingredients: ['Eel', 'Tare glaze', 'Sushi rice', 'Sansho', 'Nori'],               gradient: 'linear-gradient(135deg,#f8c98a 0%,#a85820 60%,#3a1604 100%)' },
  sh05: { prep: 18, cal: 540, spice: 0, vegetarian: false, ingredients: ['Black cod', 'White miso', 'Mirin', 'Sake', 'Sugar'],               gradient: 'linear-gradient(135deg,#fae0b0 0%,#c08a3a 60%,#3a2604 100%)' },
  sh06: { prep: 12, cal: 720, spice: 1, vegetarian: false, ingredients: ['Pork belly', 'Pork bones', 'Ramen noodles', 'Ajitama', 'Nori', 'Scallion'], gradient: 'linear-gradient(135deg,#fbe2bc 0%,#b56830 60%,#3e1604 100%)' },
  sh07: { prep: 12, cal: 760, spice: 3, vegetarian: false, ingredients: ['Ground pork', 'Red miso', 'Ramen noodles', 'Chili oil', 'Bean sprouts'], gradient: 'linear-gradient(135deg,#ffaf80 0%,#c2331a 60%,#410404 100%)' },
  sh08: { prep: 10, cal: 480, spice: 0, vegetarian: false, ingredients: ['Tiger prawns', 'Tempura flour', 'Tentsuyu', 'Daikon'],             gradient: 'linear-gradient(135deg,#ffe6b6 0%,#d6a14a 60%,#5a3608 100%)' },
  sh09: { prep: 14, cal: 880, spice: 1, vegetarian: false, ingredients: ['Chicken thigh', 'Panko', 'Japanese curry', 'Sushi rice', 'Onion'], gradient: 'linear-gradient(135deg,#fbcc8a 0%,#a45614 60%,#3a1602 100%)' },
  sh10: { prep: 12, cal: 540, spice: 0, vegetarian: false, ingredients: ['Salmon', 'Soy', 'Mirin', 'Sake', 'Sansho'],                        gradient: 'linear-gradient(135deg,#ffc28a 0%,#cc4a1a 60%,#430a04 100%)' },
  sh11: { prep: 16, cal: 480, spice: 1, vegetarian: false, ingredients: ['Chicken thigh', 'Chicken skin', 'Tare', 'Tsukune', 'Scallion'],    gradient: 'linear-gradient(135deg,#f6c08a 0%,#9c4214 60%,#2e0a02 100%)' },

  // Desserts · 甘味
  km01: { prep: 5,  cal: 380, spice: 0, vegetarian: true,  ingredients: ['Mascarpone', 'Matcha powder', 'Lady fingers', 'Sugar', 'Egg'],     gradient: 'linear-gradient(135deg,#dcebb8 0%,#7a9a3a 60%,#2a3e0c 100%)' },
  km02: { prep: 3,  cal: 320, spice: 0, vegetarian: true,  ingredients: ['Mochi', 'Yuzu', 'Matcha', 'Black sesame', 'Cream'],                gradient: 'linear-gradient(135deg,#f4e2d8 0%,#c8a08a 60%,#5a3a2a 100%)' },
  km03: { prep: 6,  cal: 420, spice: 0, vegetarian: true,  ingredients: ['Cream cheese', 'Yuzu zest', 'Sugar', 'Egg', 'Biscuit base'],       gradient: 'linear-gradient(135deg,#fff5b8 0%,#d8b54a 60%,#5a4308 100%)' },
  km04: { prep: 4,  cal: 280, spice: 0, vegetarian: true,  ingredients: ['Agar', 'Red bean paste', 'Brown sugar syrup', 'Mochi', 'Fruit'],   gradient: 'linear-gradient(135deg,#f3e1d2 0%,#aa6a3a 60%,#2e1808 100%)' },
  km05: { prep: 8,  cal: 460, spice: 0, vegetarian: true,  ingredients: ['Heavy cream', 'Black sesame', 'Egg yolk', 'Sugar', 'Gold leaf'],   gradient: 'linear-gradient(135deg,#e8dac0 0%,#806848 60%,#22180a 100%)' },

  // Drinks · 飲み物
  nm01: { prep: 1, cal: 80,  spice: 0, vegetarian: true, ingredients: ['Hibiki 17 whisky', 'Suntory blend'],                                 gradient: 'linear-gradient(135deg,#f8d28a 0%,#a25a1a 60%,#2a0a02 100%)' },
  nm02: { prep: 1, cal: 180, spice: 0, vegetarian: true, ingredients: ['Junmai daiginjo sake'],                                              gradient: 'linear-gradient(135deg,#fffce0 0%,#dcc88a 60%,#7a623a 100%)' },
  nm03: { prep: 2, cal: 160, spice: 0, vegetarian: true, ingredients: ['Toki whisky', 'Yuzu juice', 'Soda water'],                           gradient: 'linear-gradient(135deg,#fff4b0 0%,#c69a30 60%,#4a3508 100%)' },
  nm04: { prep: 3, cal: 220, spice: 0, vegetarian: true, ingredients: ['White rum', 'Sakura syrup', 'Lime', 'Mint'],                         gradient: 'linear-gradient(135deg,#ffd0e3 0%,#e8688a 60%,#5a142e 100%)' },
  nm05: { prep: 3, cal: 180, spice: 0, vegetarian: true, ingredients: ['Matcha powder', 'Oat milk', 'Sugar'],                                gradient: 'linear-gradient(135deg,#cbe5a8 0%,#5e9a3a 60%,#1a3008 100%)' },
  nm06: { prep: 4, cal: 4,   spice: 0, vegetarian: true, ingredients: ['Hojicha leaves'],                                                    gradient: 'linear-gradient(135deg,#e8c890 0%,#9a6a30 60%,#3a2008 100%)' },
  nm07: { prep: 4, cal: 6,   spice: 0, vegetarian: true, ingredients: ['Genmaicha leaves', 'Toasted rice'],                                  gradient: 'linear-gradient(135deg,#f3dc9a 0%,#a07a30 60%,#3a2606 100%)' },
  nm08: { prep: 1, cal: 200, spice: 0, vegetarian: true, ingredients: ['Asahi lager', '5% ABV'],                                             gradient: 'linear-gradient(135deg,#fff0a8 0%,#cea622 60%,#4a3a02 100%)' },
  nm09: { prep: 1, cal: 280, spice: 0, vegetarian: true, ingredients: ['Sapporo lager', '5% ABV'],                                           gradient: 'linear-gradient(135deg,#ffe890 0%,#b88830 60%,#3e2806 100%)' },
  nm10: { prep: 1, cal: 140, spice: 0, vegetarian: true, ingredients: ['Ramune soda', 'Marble bottle'],                                      gradient: 'linear-gradient(135deg,#cfeaff 0%,#5b9fc8 60%,#0e2a55 100%)' },
};

// === Demand baseline (premium Japanese fine-dining, dinner-led) ===
// Hour-of-day relative weights — mostly evening service for an upscale izakaya/kaiseki spot.
const HOUR_DEMAND = {
  11: 0.20, 12: 0.85, 13: 1.10, 14: 0.55, 15: 0.20,
  16: 0.20, 17: 0.55, 18: 1.20, 19: 1.85, 20: 2.10, 21: 1.75,
  22: 1.10, 23: 0.50,
};
const DOW_FACTOR = { 0: 1.10, 1: 0.75, 2: 0.80, 3: 0.90, 4: 1.05, 5: 1.45, 6: 1.55 }; // Sun..Sat
const BASELINE_COVERS_PER_DAY = 120;
const AVG_CHECK = 2400; // ₹ — premium ticket avg

// Category share of orders (sums to ~1)
const CAT_SHARE = {
  starters: 0.20, mains: 0.50, desserts: 0.12, drinks: 0.18,
};

// Open shift starts empty — no seeded history
const SEED_HISTORY = [];

// === Helpers ===
const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const TAX_RATE = 0.05; // GST 5% for restaurants
const uid = () => Math.random().toString(36).slice(2, 9);

const meta = (id) => MENU_META[id] || { prep: 12, cal: 350, spice: 0, vegetarian: true, ingredients: [], gradient: 'linear-gradient(135deg,#f4ead0,#a07030,#2a1a06)' };

// === Image overrides (custom dish photos) ===
// Stored in localStorage by item id. Each entry is either an array of URLs
// (for 360° spin) or — for backward compatibility — a single string. The
// helpers normalize to an array so callers don't need to branch.
const IMG_LS = 'akane-pos-img-overrides';
const loadImgs = () => { try { return JSON.parse(localStorage.getItem(IMG_LS) || '{}'); } catch { return {}; } };
const saveImgs = (m) => { try { localStorage.setItem(IMG_LS, JSON.stringify(m)); } catch {} };

// One-time prune: drop any cached external (http/https) URLs that may have
// gone 404 / expired (e.g. old Pexels CDN links from a prior auto-fetch).
// User-uploaded relative paths and our DEFAULT_IMAGES fallbacks survive.
// Keyed migration so it only runs once per new build.
(function pruneStaleImageCache() {
  const MIG_KEY = 'wabi-img-cache-pruned-v1';
  try {
    if (localStorage.getItem(MIG_KEY)) return;
    const raw = localStorage.getItem(IMG_LS);
    if (raw) {
      const cur = JSON.parse(raw);
      const cleaned = {};
      let removed = 0;
      for (const [id, v] of Object.entries(cur)) {
        const urls = Array.isArray(v) ? v : [v];
        const local = urls.filter(u => typeof u === 'string' && !/^https?:\/\//i.test(u));
        if (local.length) cleaned[id] = local.length === 1 ? local[0] : local;
        else removed++;
      }
      localStorage.setItem(IMG_LS, JSON.stringify(cleaned));
      if (removed) console.info(`[wabi] pruned ${removed} stale external image URL(s) from cache`);
    }
    localStorage.setItem(MIG_KEY, '1');
  } catch {}
})();

// Hand-curated dish photos shipped with the app. Used as a fallback when
// there's no localStorage override — meaning the customer screen renders
// these immediately on first load with no API calls. localStorage still wins
// (so user/auto-fetch overrides are honoured).
const DEFAULT_IMAGES = {
  // Starters · 前菜
  za01: 'edamame.webp',                                        // Edamame Yuzu Salt
  za02: 'hamachi.jpeg',                                        // Hamachi Crudo
  za03: 'Takoyaki Recipe (たこ焼き).avif',     // Takoyaki
  za04: 'wagyu-tataki.jpeg',                                   // Wagyu Tataki
  za05: 'ikura tarte.jpg',                                     // Ikura Tartare

  // Mains · 主菜
  sh01: 'Otoro-Sushi-Queens.jpg',                              // Otoro Omakase
  sh02: 'Chirashi-don-Final-1-scaled.jpg',                     // Chirashi Bowl
  sh04: 'unagi-don.jpeg',                                      // Unagi Don
  sh06: 'tonkotsu.jpeg',                                       // Tonkotsu Ramen
  sh07: 'spicy miso ramen.jpg',                                // Spicy Miso Ramen
  sh09: 'Chicken-Katsu-Curry.jpg',                             // Chicken Katsu Curry

  // Desserts · 甘味
  km01: 'Matcha-Tiramisu-A-baJillian-Recipes-15.jpg',          // Matcha Tiramisu
  km02: 'mochi .jpg.avif',                                     // Mochi Ice Cream Trio
  km03: 'yuzu cheesecake.webp',                                // Yuzu Cheesecake
  km04: 'anmitsu-thumb-550x550.jpg',                           // Kuromitsu Anmitsu
  km05: 'SFS_BlackSesameCremeBrulee-2-1_nuaodr.webp',          // Black Sesame Brûlée

  // Drinks · 飲み物
  nm02: 'sake-japan-samurai-junmai-daiginjo-72cl.jpg.png',     // Junmai Daiginjo Sake
  nm03: 'Mikks_Whisky-Yuzu-Highball_803d3ed0-ab12-404e-adef-48be6546f68b.png.webp', // Yuzu Highball
  nm04: 'sakura-mojito.jpeg',                                  // Sakura Mojito
  nm05: 'matcha-latte.jpeg',                                   // Iced Matcha Latte
  nm06: 'black-sugar-hojicha-latte-7.jpg',                     // Hojicha
  nm07: 'Genmaicha_tea_brewed_and_unbrewed.jpg',               // Genmaicha
  nm08: 'aashi super dry.webp',                                // Asahi Super Dry
  nm09: 'sappora.png',                                         // Sapporo Premium
  nm10: 'ramune soda.jpg',                                     // Ramune Soda
};

const imgsFor = (id) => {
  try {
    const v = loadImgs()[id];
    if (v) {
      if (Array.isArray(v)) return v.filter(Boolean);
      return [v];
    }
  } catch {}
  const def = DEFAULT_IMAGES[id];
  return def ? [def] : [];
};
// First-image accessor (for cards / list views that show a single still)
const imgFor = (id) => imgsFor(id)[0] || null;

// === 3D model overrides (GLB files for AR/VR view) ===
// Real 3D models render via <model-viewer> in DishXR's 3D / AR / VR modes,
// taking precedence over the photo-based pseudo-3D fallback.
// Drop GLB files in the project root and map them here.
const MODELS = {
  za02: 'hamachi.glb?v=2',       // Hamachi Crudo
  sh04: 'unagi-don.glb',         // Unagi Don
  sh06: 'tonkotsu.glb?v=2',      // Tonkotsu Ramen
  km02: 'mochi%20.glb',          // Mochi Ice Cream Trio (filename has a space)
  nm05: 'matcha-latte.glb',      // Iced Matcha Latte
};
const modelFor = (id) => MODELS[id] || null;

// === Inventory ===
// Stocked ingredients for a Japanese fine-dining kitchen. INR pricing.
const INVENTORY_BASELINE = {
  // Protein — Tsukiji Direct (fish) / Wagyu Imports (beef) / local poultry
  'Bluefin otoro':      { cat: 'protein', stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 8800, supplier: 'Tsukiji Direct' },
  'Yellowtail':         { cat: 'protein', stock: 6,  unit: 'kg', par: 8,  reorder: 3,   costPer: 2400, supplier: 'Tsukiji Direct' },
  'Tuna':               { cat: 'protein', stock: 8,  unit: 'kg', par: 10, reorder: 3,   costPer: 1800, supplier: 'Tsukiji Direct' },
  'Salmon':             { cat: 'protein', stock: 12, unit: 'kg', par: 15, reorder: 4,   costPer: 1600, supplier: 'Tsukiji Direct' },
  'Salmon belly':       { cat: 'protein', stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 2200, supplier: 'Tsukiji Direct' },
  'Salmon roe':         { cat: 'protein', stock: 1.2,unit: 'kg', par: 2,  reorder: 0.5, costPer: 6400, supplier: 'Tsukiji Direct' },
  'Black cod':          { cat: 'protein', stock: 5,  unit: 'kg', par: 7,  reorder: 2,   costPer: 3200, supplier: 'Tsukiji Direct' },
  'Eel':                { cat: 'protein', stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 2800, supplier: 'Tsukiji Direct' },
  'Tiger prawns':       { cat: 'protein', stock: 8,  unit: 'kg', par: 10, reorder: 3,   costPer: 1400, supplier: 'Tsukiji Direct' },
  'Octopus':            { cat: 'protein', stock: 5,  unit: 'kg', par: 7,  reorder: 2,   costPer: 1600, supplier: 'Tsukiji Direct' },
  'Wagyu A5':           { cat: 'protein', stock: 3,  unit: 'kg', par: 5,  reorder: 1.5, costPer: 14000,supplier: 'Wagyu Imports Co.' },
  'Chicken thigh':      { cat: 'protein', stock: 14, unit: 'kg', par: 18, reorder: 5,   costPer: 280,  supplier: 'Sango Foods' },
  'Chicken skin':       { cat: 'protein', stock: 2,  unit: 'kg', par: 3,  reorder: 1,   costPer: 180,  supplier: 'Sango Foods' },
  'Pork belly':         { cat: 'protein', stock: 12, unit: 'kg', par: 15, reorder: 4,   costPer: 540,  supplier: 'Sango Foods' },
  'Pork bones':         { cat: 'protein', stock: 18, unit: 'kg', par: 24, reorder: 6,   costPer: 120,  supplier: 'Sango Foods' },
  'Ground pork':        { cat: 'protein', stock: 6,  unit: 'kg', par: 8,  reorder: 2,   costPer: 480,  supplier: 'Sango Foods' },

  // Dairy / eggs
  'Eggs':               { cat: 'dairy',   stock: 240,unit: 'pc', par: 300,reorder: 96,  costPer: 8,    supplier: 'Anand Dairy' },
  'Quail egg':          { cat: 'dairy',   stock: 60, unit: 'pc', par: 96, reorder: 24,  costPer: 18,   supplier: 'Anand Dairy' },
  'Heavy cream':        { cat: 'dairy',   stock: 8,  unit: 'L',  par: 12, reorder: 3,   costPer: 380,  supplier: 'Anand Dairy' },
  'Cream cheese':       { cat: 'dairy',   stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 720,  supplier: 'Anand Dairy' },
  'Mascarpone':         { cat: 'dairy',   stock: 3,  unit: 'kg', par: 5,  reorder: 1.5, costPer: 980,  supplier: 'Anand Dairy' },
  'Oat milk':           { cat: 'dairy',   stock: 12, unit: 'L',  par: 18, reorder: 5,   costPer: 320,  supplier: 'Sango Foods' },

  // Produce (Japanese imports / local)
  'Yuzu':               { cat: 'produce', stock: 1.5,unit: 'kg', par: 2.5,reorder: 0.5, costPer: 4800, supplier: 'Sango Foods' },
  'Yuzu juice':         { cat: 'produce', stock: 2,  unit: 'L',  par: 3,  reorder: 1,   costPer: 2200, supplier: 'Sango Foods' },
  'Yuzu zest':          { cat: 'produce', stock: 0.4,unit: 'kg', par: 0.6,reorder: 0.2, costPer: 5600, supplier: 'Sango Foods' },
  'Daikon':             { cat: 'produce', stock: 8,  unit: 'kg', par: 10, reorder: 3,   costPer: 80,   supplier: 'KR Market' },
  'Spring onion':       { cat: 'produce', stock: 2,  unit: 'kg', par: 3,  reorder: 1,   costPer: 80,   supplier: 'KR Market' },
  'Chives':             { cat: 'produce', stock: 1,  unit: 'kg', par: 1.5,reorder: 0.4, costPer: 220,  supplier: 'KR Market' },
  'Shiitake':           { cat: 'produce', stock: 2,  unit: 'kg', par: 3,  reorder: 1,   costPer: 980,  supplier: 'Sango Foods' },
  'Bok choy':           { cat: 'produce', stock: 3,  unit: 'kg', par: 4,  reorder: 1,   costPer: 120,  supplier: 'KR Market' },
  'Bean sprouts':       { cat: 'produce', stock: 2,  unit: 'kg', par: 3,  reorder: 1,   costPer: 80,   supplier: 'KR Market' },
  'Bamboo shoots':      { cat: 'produce', stock: 1.5,unit: 'kg', par: 2.5,reorder: 0.5, costPer: 360,  supplier: 'Sango Foods' },
  'Edamame':            { cat: 'produce', stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 320,  supplier: 'Sango Foods' },
  'Onion':              { cat: 'produce', stock: 18, unit: 'kg', par: 22, reorder: 6,   costPer: 30,   supplier: 'KR Market' },
  'Ginger':             { cat: 'produce', stock: 3,  unit: 'kg', par: 4,  reorder: 1,   costPer: 220,  supplier: 'KR Market' },
  'Garlic':             { cat: 'produce', stock: 3,  unit: 'kg', par: 4,  reorder: 1,   costPer: 240,  supplier: 'KR Market' },
  'Lime':               { cat: 'produce', stock: 4,  unit: 'kg', par: 5,  reorder: 1,   costPer: 90,   supplier: 'KR Market' },
  'Lemon':              { cat: 'produce', stock: 4,  unit: 'kg', par: 5,  reorder: 1,   costPer: 90,   supplier: 'KR Market' },
  'Mint':               { cat: 'produce', stock: 1.5,unit: 'kg', par: 2,  reorder: 0.5, costPer: 220,  supplier: 'KR Market' },
  'Micro shiso':        { cat: 'produce', stock: 0.4,unit: 'kg', par: 0.6,reorder: 0.2, costPer: 4800, supplier: 'Sango Foods' },
  'Fruit':              { cat: 'produce', stock: 3,  unit: 'kg', par: 5,  reorder: 1,   costPer: 220,  supplier: 'KR Market' },

  // Pantry / dry
  'Sushi rice':         { cat: 'dry',     stock: 32, unit: 'kg', par: 45, reorder: 12,  costPer: 280,  supplier: 'Sango Foods' },
  'Brown rice':         { cat: 'dry',     stock: 12, unit: 'kg', par: 18, reorder: 5,   costPer: 220,  supplier: 'Sango Foods' },
  'Ramen noodles':      { cat: 'dry',     stock: 18, unit: 'kg', par: 24, reorder: 6,   costPer: 360,  supplier: 'Sango Foods' },
  'Tempura flour':      { cat: 'dry',     stock: 8,  unit: 'kg', par: 12, reorder: 3,   costPer: 280,  supplier: 'Sango Foods' },
  'Panko':              { cat: 'dry',     stock: 6,  unit: 'kg', par: 10, reorder: 3,   costPer: 320,  supplier: 'Sango Foods' },
  'Nori':               { cat: 'dry',     stock: 1.2,unit: 'kg', par: 2,  reorder: 0.5, costPer: 3600, supplier: 'Sango Foods' },
  'Mirin':              { cat: 'dry',     stock: 8,  unit: 'L',  par: 12, reorder: 3,   costPer: 480,  supplier: 'Sango Foods' },
  'Soy':                { cat: 'dry',     stock: 12, unit: 'L',  par: 18, reorder: 5,   costPer: 280,  supplier: 'Sango Foods' },
  'White miso':         { cat: 'dry',     stock: 5,  unit: 'kg', par: 7,  reorder: 2,   costPer: 720,  supplier: 'Sango Foods' },
  'Red miso':           { cat: 'dry',     stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 820,  supplier: 'Sango Foods' },
  'Sake':               { cat: 'dry',     stock: 6,  unit: 'L',  par: 9,  reorder: 2,   costPer: 540,  supplier: 'Sango Foods' },
  'Rice vinegar':       { cat: 'dry',     stock: 6,  unit: 'L',  par: 8,  reorder: 2,   costPer: 380,  supplier: 'Sango Foods' },
  'Dashi':              { cat: 'dry',     stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 1100, supplier: 'Sango Foods' },
  'Bonito flakes':      { cat: 'dry',     stock: 2,  unit: 'kg', par: 3,  reorder: 1,   costPer: 2800, supplier: 'Sango Foods' },
  'Wasabi':             { cat: 'dry',     stock: 1,  unit: 'kg', par: 1.5,reorder: 0.4, costPer: 4400, supplier: 'Sango Foods' },
  'Sansho':             { cat: 'dry',     stock: 0.3,unit: 'kg', par: 0.5,reorder: 0.1, costPer: 9800, supplier: 'Sango Foods' },
  'Sesame oil':         { cat: 'dry',     stock: 4,  unit: 'L',  par: 6,  reorder: 2,   costPer: 480,  supplier: 'Sango Foods' },
  'Black sesame':       { cat: 'dry',     stock: 1.5,unit: 'kg', par: 2,  reorder: 0.5, costPer: 1200, supplier: 'Sango Foods' },
  'Sea salt':           { cat: 'dry',     stock: 4,  unit: 'kg', par: 6,  reorder: 1.5, costPer: 320,  supplier: 'Sango Foods' },
  'Sugar':              { cat: 'dry',     stock: 18, unit: 'kg', par: 22, reorder: 5,   costPer: 45,   supplier: 'Daawat Wholesale' },
  'Brown sugar':        { cat: 'dry',     stock: 6,  unit: 'kg', par: 8,  reorder: 2,   costPer: 80,   supplier: 'Daawat Wholesale' },
  'Brown sugar syrup':  { cat: 'dry',     stock: 3,  unit: 'L',  par: 5,  reorder: 1,   costPer: 320,  supplier: 'Daawat Wholesale' },
  'Matcha powder':      { cat: 'dry',     stock: 1.5,unit: 'kg', par: 2.5,reorder: 0.5, costPer: 8400, supplier: 'Sango Foods' },
  'Hojicha leaves':     { cat: 'dry',     stock: 1.5,unit: 'kg', par: 2,  reorder: 0.5, costPer: 1800, supplier: 'Sango Foods' },
  'Genmaicha leaves':   { cat: 'dry',     stock: 1.5,unit: 'kg', par: 2,  reorder: 0.5, costPer: 1600, supplier: 'Sango Foods' },
  'Toasted rice':       { cat: 'dry',     stock: 1,  unit: 'kg', par: 1.5,reorder: 0.4, costPer: 360,  supplier: 'Sango Foods' },
  'Mochi':              { cat: 'dry',     stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 980,  supplier: 'Sango Foods' },
  'Red bean paste':     { cat: 'dry',     stock: 3,  unit: 'kg', par: 5,  reorder: 1.5, costPer: 880,  supplier: 'Sango Foods' },
  'Agar':               { cat: 'dry',     stock: 0.4,unit: 'kg', par: 0.6,reorder: 0.2, costPer: 1800, supplier: 'Sango Foods' },
  'Lady fingers':       { cat: 'dry',     stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 480,  supplier: 'Sango Foods' },
  'Biscuit base':       { cat: 'dry',     stock: 3,  unit: 'kg', par: 5,  reorder: 1.5, costPer: 360,  supplier: 'Sango Foods' },
  'Gold leaf':          { cat: 'dry',     stock: 0.02,unit:'kg', par: 0.05,reorder: 0.01,costPer: 320000,supplier: 'Sango Foods' },
  'Kuromame':           { cat: 'dry',     stock: 1,  unit: 'kg', par: 1.5,reorder: 0.4, costPer: 1200, supplier: 'Sango Foods' },
  'Gingko':             { cat: 'dry',     stock: 0.5,unit: 'kg', par: 0.8,reorder: 0.2, costPer: 2400, supplier: 'Sango Foods' },
  'Tare glaze':         { cat: 'dry',     stock: 4,  unit: 'L',  par: 6,  reorder: 2,   costPer: 480,  supplier: 'In-house' },
  'Tentsuyu':           { cat: 'dry',     stock: 4,  unit: 'L',  par: 6,  reorder: 2,   costPer: 480,  supplier: 'In-house' },
  'Ponzu':              { cat: 'dry',     stock: 6,  unit: 'L',  par: 8,  reorder: 2,   costPer: 540,  supplier: 'Sango Foods' },
  'Kewpie':             { cat: 'dry',     stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 720,  supplier: 'Sango Foods' },
  'Tonkatsu':           { cat: 'dry',     stock: 4,  unit: 'L',  par: 6,  reorder: 2,   costPer: 540,  supplier: 'Sango Foods' },
  'Japanese curry':     { cat: 'dry',     stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 880,  supplier: 'Sango Foods' },
  'Chili oil':          { cat: 'dry',     stock: 3,  unit: 'L',  par: 5,  reorder: 1,   costPer: 540,  supplier: 'Sango Foods' },
  'Tofu':               { cat: 'dry',     stock: 12, unit: 'kg', par: 18, reorder: 5,   costPer: 220,  supplier: 'Sango Foods' },
  'Silken tofu':        { cat: 'dry',     stock: 8,  unit: 'kg', par: 12, reorder: 3,   costPer: 260,  supplier: 'Sango Foods' },
  'Garlic chips':       { cat: 'dry',     stock: 0.6,unit: 'kg', par: 1,  reorder: 0.3, costPer: 1800, supplier: 'In-house' },
  'Sweet corn':         { cat: 'dry',     stock: 4,  unit: 'kg', par: 6,  reorder: 2,   costPer: 220,  supplier: 'KR Market' },
  'Tsukune':            { cat: 'dry',     stock: 3,  unit: 'kg', par: 5,  reorder: 1.5, costPer: 480,  supplier: 'In-house' },
  'Sakura syrup':       { cat: 'dry',     stock: 2,  unit: 'L',  par: 3,  reorder: 1,   costPer: 1800, supplier: 'Sango Foods' },

  // Beverage
  'Asahi lager':        { cat: 'beverage',stock: 60, unit: 'btl',par: 80, reorder: 24,  costPer: 220,  supplier: 'Asahi Beverages' },
  'Sapporo lager':      { cat: 'beverage',stock: 36, unit: 'btl',par: 48, reorder: 14,  costPer: 320,  supplier: 'Asahi Beverages' },
  'Junmai daiginjo sake':{ cat:'beverage',stock: 14, unit: 'btl',par: 20, reorder: 6,   costPer: 4800, supplier: 'Sango Foods' },
  'Hibiki 17 whisky':   { cat: 'beverage',stock: 4,  unit: 'btl',par: 6,  reorder: 1,   costPer: 32000,supplier: 'Suntory India' },
  'Toki whisky':        { cat: 'beverage',stock: 6,  unit: 'btl',par: 8,  reorder: 2,   costPer: 4800, supplier: 'Suntory India' },
  'White rum':          { cat: 'beverage',stock: 5,  unit: 'btl',par: 7,  reorder: 2,   costPer: 1800, supplier: 'Bacardi' },
  'Soda water':         { cat: 'beverage',stock: 36, unit: 'btl',par: 48, reorder: 14,  costPer: 25,   supplier: 'Coca-Cola' },
  'Ramune soda':        { cat: 'beverage',stock: 36, unit: 'btl',par: 48, reorder: 14,  costPer: 80,   supplier: 'Sango Foods' },
};

// === Recipes ===
// Per-dish ingredient consumption. Quantities in the unit declared in
// INVENTORY_BASELINE for that ingredient. Negligibles intentionally omitted.
const RECIPES = {
  // Starters
  za01: { Edamame: 0.18, 'Yuzu zest': 0.002, 'Sea salt': 0.003 },
  za02: { Yellowtail: 0.10, Ponzu: 0.02, 'Yuzu juice': 0.005, 'Micro shiso': 0.002 },
  za03: { Octopus: 0.12, 'Tempura flour': 0.04, 'Bonito flakes': 0.005, Kewpie: 0.02, Tonkatsu: 0.02 },
  za04: { 'Wagyu A5': 0.10, Ponzu: 0.02, 'Garlic chips': 0.005, 'Sea salt': 0.002, Chives: 0.005 },
  za05: { 'Salmon belly': 0.08, 'Salmon roe': 0.02, 'Quail egg': 1, Soy: 0.01, 'Sesame oil': 0.005 },
  za06: { 'Silken tofu': 0.18, Dashi: 0.06, Soy: 0.01, Mirin: 0.01, Daikon: 0.04 },
  za07: { Eggs: 1.5, Dashi: 0.10, 'Tiger prawns': 0.04, Shiitake: 0.02, Mirin: 0.005 },

  // Mains
  sh01: { 'Bluefin otoro': 0.15, 'Sushi rice': 0.10, Wasabi: 0.005, Soy: 0.01, Nori: 0.003 },
  sh02: { Tuna: 0.06, Salmon: 0.06, Yellowtail: 0.06, 'Sushi rice': 0.18, 'Salmon roe': 0.015 },
  sh03: { 'Wagyu A5': 0.18, Shiitake: 0.04, Tofu: 0.05, 'Bok choy': 0.06, Eggs: 1, Mirin: 0.02 },
  sh04: { Eel: 0.18, 'Tare glaze': 0.04, 'Sushi rice': 0.18, Sansho: 0.001, Nori: 0.003 },
  sh05: { 'Black cod': 0.18, 'White miso': 0.05, Mirin: 0.02, Sake: 0.02, Sugar: 0.01 },
  sh06: { 'Pork belly': 0.10, 'Pork bones': 0.30, 'Ramen noodles': 0.18, Eggs: 1, Nori: 0.002, 'Spring onion': 0.01 },
  sh07: { 'Ground pork': 0.10, 'Red miso': 0.05, 'Ramen noodles': 0.18, 'Chili oil': 0.01, 'Bean sprouts': 0.04 },
  sh08: { 'Tiger prawns': 0.15, 'Tempura flour': 0.06, Tentsuyu: 0.04, Daikon: 0.05 },
  sh09: { 'Chicken thigh': 0.18, Panko: 0.05, 'Japanese curry': 0.06, 'Sushi rice': 0.16, Onion: 0.05 },
  sh10: { Salmon: 0.18, Soy: 0.02, Mirin: 0.02, Sake: 0.01, Sansho: 0.001 },
  sh11: { 'Chicken thigh': 0.14, 'Chicken skin': 0.04, 'Tare glaze': 0.03, Tsukune: 0.06, 'Spring onion': 0.01 },

  // Desserts
  km01: { Mascarpone: 0.06, 'Matcha powder': 0.005, 'Lady fingers': 0.04, Sugar: 0.03, Eggs: 1 },
  km02: { Mochi: 0.08, Yuzu: 0.005, 'Matcha powder': 0.002, 'Black sesame': 0.005, 'Heavy cream': 0.04 },
  km03: { 'Cream cheese': 0.08, 'Yuzu zest': 0.003, Sugar: 0.03, Eggs: 1, 'Biscuit base': 0.04 },
  km04: { Agar: 0.005, 'Red bean paste': 0.04, 'Brown sugar syrup': 0.02, Mochi: 0.03, Fruit: 0.04 },
  km05: { 'Heavy cream': 0.10, 'Black sesame': 0.005, Eggs: 1, Sugar: 0.03, 'Gold leaf': 0.0001 },

  // Drinks
  nm01: { 'Hibiki 17 whisky': 0.03 },
  nm02: { 'Junmai daiginjo sake': 0.18 },
  nm03: { 'Toki whisky': 0.04, 'Yuzu juice': 0.02, 'Soda water': 1 },
  nm04: { 'White rum': 0.06, 'Sakura syrup': 0.02, Lime: 0.01, Mint: 0.003 },
  nm05: { 'Matcha powder': 0.005, 'Oat milk': 0.20, Sugar: 0.01 },
  nm06: { 'Hojicha leaves': 0.005 },
  nm07: { 'Genmaicha leaves': 0.005, 'Toasted rice': 0.001 },
  nm08: { 'Asahi lager': 1 },
  nm09: { 'Sapporo lager': 1 },
  nm10: { 'Ramune soda': 1 },
};

window.POS_DATA = {
  CATEGORIES, MENU, MENU_META, MOD_GROUPS, TABLES, SECTION_FRAMES, STAFF, SEED_HISTORY,
  HOUR_DEMAND, DOW_FACTOR, BASELINE_COVERS_PER_DAY, AVG_CHECK, CAT_SHARE,
  INVENTORY_BASELINE, RECIPES,
  fmt, TAX_RATE, uid, meta,
  loadImgs, saveImgs, imgFor, imgsFor,
  MODELS, modelFor,
};
