// ============ Quantum Medical Supply — Product catalog ============

const CATEGORIES = [
  { id: 'diagnostics',  name: 'Diagnostics',         blurb: 'Stethoscopes, oximeters, thermometers',  color: '#0b6cff', icon: '◐' },
  { id: 'ppe',          name: 'PPE & Infection',     blurb: 'Gloves, masks, gowns, sanitizer',         color: '#00b8a9', icon: '◇' },
  { id: 'mobility',     name: 'Mobility & Rehab',    blurb: 'Walkers, wheelchairs, braces',            color: '#6c5ce7', icon: '▲' },
  { id: 'wound',        name: 'Wound Care',          blurb: 'Dressings, gauze, antiseptics',           color: '#ef4444', icon: '✚' },
  { id: 'monitoring',   name: 'Patient Monitoring',  blurb: 'BP monitors, ECG, glucose',               color: '#f59e0b', icon: '♥' },
  { id: 'surgical',     name: 'Surgical & Exam',     blurb: 'Instruments, sutures, drapes',            color: '#0b1220', icon: '◼' },
  { id: 'respiratory',  name: 'Respiratory',         blurb: 'Nebulizers, CPAP, oxygen',                color: '#0891b2', icon: '◉' },
  { id: 'first-aid',    name: 'First Aid',           blurb: 'Kits, bandages, ice packs',               color: '#16a34a', icon: '◈' },
];

// SVG illustrations — simple, on-brand
const SVG = {
  stethoscope: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="155" cy="90" r="28" fill="none" stroke="#0b6cff" stroke-width="6"/><circle cx="155" cy="90" r="14" fill="#0b6cff" opacity=".18"/><path d="M50 40 Q50 100 100 130 Q150 100 150 60" fill="none" stroke="#0b1220" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="40" r="8" fill="#0b1220"/><circle cx="150" cy="60" r="6" fill="#0b1220"/><path d="M100 130 L100 160" stroke="#0b1220" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="100" cy="170" r="10" fill="#00b8a9"/></svg>`,
  oximeter: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="60" width="120" height="80" rx="14" fill="#0b1220"/><rect x="56" y="76" width="88" height="40" rx="6" fill="#00ff9d" opacity=".18"/><text x="100" y="104" font-family="monospace" font-size="22" fill="#00b8a9" text-anchor="middle" font-weight="700">98%</text><rect x="76" y="130" width="48" height="14" rx="4" fill="#0b6cff"/></svg>`,
  thermometer: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="60" y="50" width="80" height="100" rx="14" fill="#0b6cff"/><rect x="74" y="70" width="52" height="40" rx="4" fill="#e7f0ff"/><text x="100" y="98" font-family="monospace" font-size="16" fill="#0b1220" text-anchor="middle" font-weight="700">98.6</text><circle cx="100" cy="135" r="10" fill="#fff"/></svg>`,
  bpcuff: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="34" y="70" width="132" height="60" rx="10" fill="#0b1220"/><rect x="50" y="86" width="100" height="28" rx="4" fill="#00b8a9" opacity=".25"/><circle cx="100" cy="100" r="14" fill="#0b6cff"/><path d="M28 100 Q14 100 14 84" stroke="#0b1220" stroke-width="6" fill="none"/></svg>`,
  gloves: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="M60 60 L60 140 Q60 160 80 160 L130 160 Q150 160 150 140 L150 100 Q150 90 140 90 L140 70 Q140 60 130 60 L130 80 Q130 70 120 70 L120 50 Q120 40 110 40 L110 70 Q110 60 100 60 L100 50 Q100 40 90 40 L90 80 Q90 70 80 70 L80 60 Q80 50 70 50 Q60 50 60 60 Z" fill="#0b6cff" opacity=".75"/></svg>`,
  mask: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="M50 80 Q100 60 150 80 L150 130 Q100 150 50 130 Z" fill="#00b8a9" opacity=".8"/><path d="M50 90 L150 90 M50 110 L150 110 M50 130 L150 130" stroke="#fff" stroke-width="2" opacity=".6"/><path d="M50 80 Q35 70 35 100 Q35 130 50 130" stroke="#0b1220" stroke-width="3" fill="none"/><path d="M150 80 Q165 70 165 100 Q165 130 150 130" stroke="#0b1220" stroke-width="3" fill="none"/></svg>`,
  gown: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="M70 50 L100 60 L130 50 L160 80 L150 100 L140 95 L140 160 L60 160 L60 95 L50 100 L40 80 Z" fill="#0b6cff" opacity=".7"/></svg>`,
  sanitizer: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="80" y="40" width="40" height="10" fill="#0b1220"/><rect x="90" y="50" width="20" height="14" fill="#0b1220"/><rect x="60" y="64" width="80" height="110" rx="8" fill="#0b6cff"/><rect x="72" y="84" width="56" height="80" rx="4" fill="#fff" opacity=".25"/></svg>`,
  walker: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="M50 60 L50 160 M150 60 L150 160 M50 60 L150 60 M50 100 L150 100" stroke="#0b6cff" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="50" cy="170" r="10" fill="#0b1220"/><circle cx="150" cy="170" r="10" fill="#0b1220"/></svg>`,
  wheelchair: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="80" cy="150" r="34" fill="none" stroke="#0b1220" stroke-width="6"/><circle cx="80" cy="150" r="6" fill="#0b1220"/><path d="M80 110 L80 70 L110 70 L130 110 L80 110 Z" fill="#0b6cff"/><circle cx="140" cy="160" r="14" fill="none" stroke="#0b1220" stroke-width="4"/></svg>`,
  brace: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="60" y="50" width="80" height="100" rx="14" fill="#0b6cff" opacity=".7"/><path d="M70 70 L130 70 M70 90 L130 90 M70 110 L130 110 M70 130 L130 130" stroke="#fff" stroke-width="3"/></svg>`,
  gauze: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="50" y="60" width="100" height="80" rx="6" fill="#fff" stroke="#0b1220" stroke-width="3"/><path d="M50 80 L150 80 M50 100 L150 100 M50 120 L150 120" stroke="#e2e8f0" stroke-width="2"/><circle cx="100" cy="100" r="14" fill="#ef4444" opacity=".7"/></svg>`,
  bandage: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="80" width="120" height="40" rx="20" fill="#f59e0b" transform="rotate(-20 100 100)"/><circle cx="92" cy="92" r="4" fill="#0b1220"/><circle cx="108" cy="108" r="4" fill="#0b1220"/><circle cx="80" cy="105" r="4" fill="#0b1220"/><circle cx="120" cy="95" r="4" fill="#0b1220"/></svg>`,
  antiseptic: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="70" y="50" width="60" height="20" fill="#0b1220"/><rect x="60" y="70" width="80" height="100" rx="8" fill="#00b8a9"/><rect x="74" y="100" width="52" height="40" fill="#fff"/><text x="100" y="125" font-family="Inter" font-size="12" fill="#0b1220" text-anchor="middle" font-weight="700">+</text></svg>`,
  ecg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="60" width="140" height="90" rx="10" fill="#0b1220"/><path d="M40 110 L70 110 L78 80 L88 140 L98 110 L130 110 L138 90 L148 130 L160 110" stroke="#00ff9d" stroke-width="3" fill="none"/></svg>`,
  glucose: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="60" y="40" width="80" height="130" rx="12" fill="#0b1220"/><rect x="74" y="60" width="52" height="40" rx="4" fill="#e7f0ff"/><text x="100" y="88" font-family="monospace" font-size="20" fill="#0b6cff" text-anchor="middle" font-weight="700">112</text><circle cx="85" cy="125" r="6" fill="#0b6cff"/><circle cx="115" cy="125" r="6" fill="#0b6cff"/><rect x="80" y="145" width="40" height="10" rx="2" fill="#0b6cff"/></svg>`,
  scalpel: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="92" width="100" height="16" rx="2" fill="#0b1220"/><path d="M130 92 L180 100 L130 108 Z" fill="#94a3b8"/></svg>`,
  sutures: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="M30 100 Q60 60 100 100 T170 100" stroke="#0b6cff" stroke-width="4" fill="none"/><path d="M50 100 L50 110 M70 80 L70 90 M90 110 L90 100 M110 90 L110 80 M130 110 L130 100 M150 80 L150 90" stroke="#0b1220" stroke-width="3"/></svg>`,
  drape: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="50" width="140" height="110" fill="#00b8a9" opacity=".7"/><circle cx="100" cy="105" r="30" fill="#fff"/><circle cx="100" cy="105" r="18" fill="#ef4444"/></svg>`,
  nebulizer: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="50" y="80" width="100" height="70" rx="10" fill="#0b1220"/><circle cx="100" cy="115" r="14" fill="#0b6cff"/><path d="M90 80 L90 50 L110 50 L110 80" fill="#94a3b8"/><path d="M75 60 Q60 50 50 60" stroke="#94a3b8" stroke-width="3" fill="none"/></svg>`,
  cpap: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="80" width="100" height="60" rx="10" fill="#0b1220"/><rect x="44" y="94" width="40" height="20" fill="#00b8a9" opacity=".5"/><path d="M130 110 Q160 110 160 80" stroke="#94a3b8" stroke-width="6" fill="none"/><circle cx="160" cy="80" r="8" fill="#0b6cff"/></svg>`,
  oxygen: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="80" y="40" width="40" height="140" rx="20" fill="#00b8a9"/><circle cx="100" cy="40" r="14" fill="#0b1220"/><text x="100" y="120" font-family="Inter" font-size="18" font-weight="800" fill="#fff" text-anchor="middle">O₂</text></svg>`,
  kit: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="60" width="120" height="100" rx="10" fill="#ef4444"/><rect x="90" y="90" width="20" height="40" fill="#fff"/><rect x="80" y="100" width="40" height="20" fill="#fff"/><rect x="70" y="50" width="60" height="14" rx="3" fill="#0b1220"/></svg>`,
  ice: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="50" y="60" width="100" height="80" rx="12" fill="#0b6cff" opacity=".4"/><path d="M100 70 L100 130 M80 80 L120 120 M80 120 L120 80" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
  forehead: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="M60 80 L100 50 L140 80 L140 130 Q140 150 120 150 L80 150 Q60 150 60 130 Z" fill="#0b6cff"/><circle cx="100" cy="100" r="12" fill="#fff"/><circle cx="100" cy="100" r="6" fill="#ef4444"/></svg>`,
  syringe: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="92" width="100" height="16" fill="#fff" stroke="#0b1220" stroke-width="3"/><rect x="40" y="92" width="50" height="16" fill="#0b6cff" opacity=".5"/><rect x="140" y="96" width="20" height="8" fill="#0b1220"/><line x1="160" y1="100" x2="190" y2="100" stroke="#94a3b8" stroke-width="3"/><rect x="30" y="84" width="10" height="32" fill="#0b1220"/></svg>`,
};

const PRODUCTS = [
  // Diagnostics
  { id: 'qm-001', name: 'Cardiology IV Digital Stethoscope', category: 'diagnostics', price: 284.00, was: 329.00, stock: 42, rating: 4.8, sku: 'STETH-CDIV', svg: 'stethoscope', badge: 'sale', featured: true, brand: 'Quantum Pro',
    desc: 'Industry-leading acoustics with active noise cancellation, Bluetooth recording, and a tunable diaphragm calibrated for both adult and pediatric auscultation.',
    features: ['Active ambient noise cancellation', 'Bluetooth 5.2 with 7-day recording memory', 'Tunable dual-sided chestpiece', '2-year manufacturer warranty'] },
  { id: 'qm-002', name: 'Fingertip Pulse Oximeter — Clinical', category: 'diagnostics', price: 89.50, stock: 200, rating: 4.7, sku: 'OXI-FT2', svg: 'oximeter', featured: true, brand: 'Quantum',
    desc: 'OLED dual-color display reports SpO₂, pulse rate, and perfusion index. FDA-cleared for clinical use.', features: ['FDA 510(k) cleared', 'SpO₂ accuracy ±2%', 'Auto-power off', '2× AAA batteries included'] },
  { id: 'qm-003', name: 'Non-Contact Infrared Thermometer', category: 'diagnostics', price: 64.99, was: 79.99, stock: 88, rating: 4.6, sku: 'IRT-200', svg: 'forehead', badge: 'sale', brand: 'Quantum',
    desc: '1-second reading from 3 cm distance, with fever alert and 32-reading memory.', features: ['±0.2°C accuracy', '1-second reading', 'Object/body mode toggle'] },
  { id: 'qm-004', name: 'Digital Oral Thermometer (Pack of 12)', category: 'diagnostics', price: 38.00, stock: 145, rating: 4.5, sku: 'TERM-12', svg: 'thermometer', brand: 'Quantum',
    desc: 'Latex-free, waterproof probes with 10-second readings. Bulk pack for clinics.', features: ['Waterproof IPX7', '10-second read time', 'Auto shut-off'] },
  { id: 'qm-005', name: 'Diagnostic Otoscope & Ophthalmoscope Set', category: 'diagnostics', price: 412.00, stock: 14, rating: 4.9, sku: 'OTO-SET', svg: 'stethoscope', badge: 'pro', featured: true, brand: 'Quantum Pro',
    desc: 'LED illumination, fiber-optic light delivery, and rechargeable handle. Includes hard carrying case.', features: ['LED 5000K illumination', 'Rechargeable lithium handle', 'Hard case + 10 specula'] },

  // PPE
  { id: 'qm-010', name: 'Nitrile Examination Gloves — 1000 ct', category: 'ppe', price: 62.00, stock: 540, rating: 4.6, sku: 'GLV-NTR-1K', svg: 'gloves', featured: true, brand: 'Quantum',
    desc: 'Powder-free, latex-free 4-mil nitrile gloves. FDA 510(k) cleared for medical exam use.', features: ['4-mil thickness', 'Powder-free, latex-free', 'Textured fingertips', 'Sizes XS–XXL available'] },
  { id: 'qm-011', name: 'N95 Respirator NIOSH — 20 ct', category: 'ppe', price: 34.99, stock: 320, rating: 4.7, sku: 'N95-20', svg: 'mask', badge: 'new', featured: true, brand: 'Quantum',
    desc: 'NIOSH-approved N95 filtering facepiece respirator. Adjustable nosepiece and dual head straps.', features: ['NIOSH approved', '≥95% filtration efficiency', 'Adjustable nosepiece'] },
  { id: 'qm-012', name: 'Surgical Mask Level 3 — 50 ct', category: 'ppe', price: 18.50, stock: 410, rating: 4.5, sku: 'SM-L3-50', svg: 'mask', brand: 'Quantum',
    desc: 'ASTM Level 3 protection with fluid resistance, 3-ply construction, and earloops.', features: ['ASTM F2100 Level 3', '3-ply construction', '≥98% bacterial filtration'] },
  { id: 'qm-013', name: 'Isolation Gown AAMI Level 2 (10 ct)', category: 'ppe', price: 48.00, stock: 110, rating: 4.4, sku: 'GWN-L2', svg: 'gown', brand: 'Quantum',
    desc: 'Disposable polypropylene gown with elastic cuffs, full back coverage, and tie closure.', features: ['AAMI PB70 Level 2', 'Elastic cuffs', 'Universal size'] },
  { id: 'qm-014', name: 'Hospital-Grade Hand Sanitizer 1 Gal', category: 'ppe', price: 24.95, stock: 230, rating: 4.6, sku: 'SAN-1G', svg: 'sanitizer', brand: 'Quantum',
    desc: '70% ethyl alcohol gel with aloe — kills 99.99% of germs in 15 seconds. Pump dispenser sold separately.', features: ['70% ethyl alcohol', 'Moisturizing aloe formula', 'EPA-listed'] },

  // Mobility
  { id: 'qm-020', name: 'Folding Two-Wheel Walker', category: 'mobility', price: 79.00, stock: 36, rating: 4.5, sku: 'MOB-WLK', svg: 'walker', brand: 'Quantum',
    desc: 'Lightweight aluminum frame, 300 lb weight capacity, height-adjustable handles, folds flat for transport.', features: ['300 lb capacity', 'Height adjustable 32–39"', 'Folds flat'] },
  { id: 'qm-021', name: 'Lightweight Transport Wheelchair', category: 'mobility', price: 249.00, was: 299.00, stock: 18, rating: 4.6, sku: 'MOB-WCH', svg: 'wheelchair', badge: 'sale', featured: true, brand: 'Quantum',
    desc: '19 lb aluminum frame with padded seat, swing-away footrests, and 250 lb capacity.', features: ['19 lb total weight', '250 lb capacity', 'Swing-away footrests'] },
  { id: 'qm-022', name: 'Universal Knee Immobilizer Brace', category: 'mobility', price: 39.00, stock: 72, rating: 4.3, sku: 'MOB-BRC', svg: 'brace', brand: 'Quantum',
    desc: 'Adjustable hook-and-loop closures with three rigid stays for post-surgical or acute injury support.', features: ['One-size adjustable 13–22"', '3 medial/lateral stays', 'Breathable mesh'] },

  // Wound care
  { id: 'qm-030', name: 'Sterile Gauze Pads 4"×4" (100 ct)', category: 'wound', price: 14.95, stock: 460, rating: 4.8, sku: 'WND-GZ4', svg: 'gauze', brand: 'Quantum',
    desc: '12-ply 100% cotton, individually wrapped sterile pads for wound dressing and absorption.', features: ['12-ply 100% cotton', 'Sterile, individually wrapped', 'Latex-free'] },
  { id: 'qm-031', name: 'Adhesive Bandages Assorted (200 ct)', category: 'wound', price: 11.50, stock: 380, rating: 4.7, sku: 'WND-BND', svg: 'bandage', brand: 'Quantum',
    desc: 'Flexible fabric bandages in 4 sizes with non-stick pad and breathable adhesive.', features: ['Latex-free adhesive', '4 assorted sizes', 'Sterile non-stick pad'] },
  { id: 'qm-032', name: 'Povidone-Iodine 10% Antiseptic 16oz', category: 'wound', price: 9.75, stock: 150, rating: 4.6, sku: 'WND-PVI', svg: 'antiseptic', brand: 'Quantum',
    desc: 'Topical antiseptic solution for skin prep and minor wound cleansing.', features: ['10% povidone-iodine', '16 oz bottle', 'For external use'] },

  // Monitoring
  { id: 'qm-040', name: 'Automatic Upper Arm BP Monitor', category: 'monitoring', price: 119.00, stock: 64, rating: 4.7, sku: 'MON-BPM', svg: 'bpcuff', featured: true, brand: 'Quantum',
    desc: 'Validated for clinical accuracy. Stores 120 readings for two users, with irregular heartbeat detection.', features: ['Clinically validated', '120-reading memory × 2 users', 'IHB detection'] },
  { id: 'qm-041', name: '3-Lead Portable ECG Monitor', category: 'monitoring', price: 489.00, stock: 8, rating: 4.6, sku: 'MON-ECG', svg: 'ecg', badge: 'pro', brand: 'Quantum Pro',
    desc: 'Battery-powered ECG with 30-second snapshot recording and Bluetooth export to PDF.', features: ['3-lead acquisition', '30-second snapshot', 'PDF export over Bluetooth'] },
  { id: 'qm-042', name: 'Blood Glucose Meter Starter Kit', category: 'monitoring', price: 32.00, stock: 95, rating: 4.5, sku: 'MON-GLU', svg: 'glucose', brand: 'Quantum',
    desc: 'No-coding meter, 10 test strips, lancing device with 10 lancets, and carrying case.', features: ['5-second results', 'Requires 0.5 µL sample', '500-reading memory'] },

  // Surgical
  { id: 'qm-050', name: 'Disposable Scalpel #11 (10 ct)', category: 'surgical', price: 12.00, stock: 220, rating: 4.7, sku: 'SUR-SC11', svg: 'scalpel', brand: 'Quantum',
    desc: 'Stainless steel #11 blade with safety-shielded handle, individually sterile-packaged.', features: ['Stainless steel blade', 'Safety shield handle', 'Ethylene oxide sterilized'] },
  { id: 'qm-051', name: 'Non-Absorbable Nylon Sutures (12 pk)', category: 'surgical', price: 78.00, stock: 40, rating: 4.6, sku: 'SUR-SUT', svg: 'sutures', brand: 'Quantum',
    desc: 'Monofilament nylon 4-0 sutures with 19mm reverse-cutting needle. Sterile, single-use.', features: ['4-0 monofilament nylon', '19mm reverse cutting', '18" suture length'] },
  { id: 'qm-052', name: 'Fenestrated Surgical Drape 50"×60"', category: 'surgical', price: 42.00, stock: 90, rating: 4.4, sku: 'SUR-DRP', svg: 'drape', brand: 'Quantum',
    desc: 'Sterile fluid-resistant drape with adhesive fenestration for procedure isolation.', features: ['Fluid resistant', '4"×6" adhesive fenestration', 'Sterile, single use'] },
  { id: 'qm-053', name: '5 mL Luer-Lok Syringe (100 ct)', category: 'surgical', price: 28.50, stock: 310, rating: 4.6, sku: 'SUR-SYR', svg: 'syringe', brand: 'Quantum',
    desc: 'Latex-free Luer-Lok tip syringes with clear barrel and bold scale markings.', features: ['Luer-Lok tip', 'Latex-free', 'Bold gradations'] },

  // Respiratory
  { id: 'qm-060', name: 'Portable Compressor Nebulizer', category: 'respiratory', price: 74.00, stock: 26, rating: 4.5, sku: 'RES-NEB', svg: 'nebulizer', brand: 'Quantum',
    desc: 'Compact piston compressor for adult and pediatric aerosol therapy.', features: ['0.15–0.4 mL/min nebulization', 'Includes mask + mouthpiece', '5-year warranty'] },
  { id: 'qm-061', name: 'Auto-Adjusting CPAP Machine', category: 'respiratory', price: 829.00, stock: 6, rating: 4.8, sku: 'RES-CPAP', svg: 'cpap', badge: 'pro', featured: true, brand: 'Quantum Pro',
    desc: 'Prescription auto-titrating CPAP with heated humidifier, SD data, and quiet 26 dBA operation.', features: ['4–20 cmH₂O range', 'Heated humidifier', '26 dBA whisper quiet', 'Rx required'] },
  { id: 'qm-062', name: 'Portable Oxygen Cylinder M6', category: 'respiratory', price: 145.00, stock: 22, rating: 4.4, sku: 'RES-O2', svg: 'oxygen', brand: 'Quantum',
    desc: 'Lightweight aluminum oxygen cylinder with toggle valve. Requires prescription for fill.', features: ['M6 (164L) capacity', 'Toggle on/off valve', 'CGA-870 post valve'] },

  // First aid
  { id: 'qm-070', name: 'OSHA 50-Person First Aid Kit', category: 'first-aid', price: 89.00, stock: 48, rating: 4.7, sku: 'FA-50P', svg: 'kit', featured: true, brand: 'Quantum',
    desc: 'Wall-mountable steel cabinet stocked to ANSI Z308.1 Class B for workplaces of up to 50 employees.', features: ['ANSI Z308.1 Class B', 'Wall mount steel cabinet', '300+ pieces included'] },
  { id: 'qm-071', name: 'Instant Cold Pack (24 ct)', category: 'first-aid', price: 22.00, stock: 180, rating: 4.5, sku: 'FA-ICE', svg: 'ice', brand: 'Quantum',
    desc: 'Single-use instant cold packs — activate by squeezing. No refrigeration required.', features: ['Single-use, squeeze to activate', '6"×9" pack size', '15+ minute cold therapy'] },
  { id: 'qm-072', name: 'Burn-Care Travel Kit', category: 'first-aid', price: 18.00, stock: 95, rating: 4.4, sku: 'FA-BRN', svg: 'kit', brand: 'Quantum',
    desc: 'Compact kit containing burn gel, sterile dressings, scissors, and gloves for minor burns.', features: ['Burn gel + sterile dressing', 'Scissors + nitrile gloves', 'Compact carry case'] },
];

function getProduct(id) { return PRODUCTS.find(p => p.id === id); }
function getCategory(id) { return CATEGORIES.find(c => c.id === id); }
function formatPrice(n) { return '$' + n.toFixed(2); }
function productSvg(p) { return SVG[p.svg] || SVG.kit; }
