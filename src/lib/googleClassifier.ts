/**
 * Client-side Google Consumer Catalog & Expenditure Classifier
 * Provides instant 0ms recognition on every keystroke for Kurkure, Lay's/Lace,
 * Meals, Thali, Pen, Bus fare, Groceries, etc.
 */

import { Category, SpendClassification } from '../types/index.js';

export interface ClientClassificationResult {
  spendClassification: SpendClassification;
  categoryMatch: string;
  matchedCategory?: Category;
  rationale: string;
  accountSuggestion: 'cash' | 'bank' | null;
}

// 1. Packaged Junk Snacks, Soda, Intoxicants & Impulse Regrets (Waste Spend)
const WASTE_ITEMS: Array<{ patterns: string[]; rationale: string; category: string }> = [
  // Indian & International Packaged Chips & Namkeen
  {
    patterns: [
      'kurkure', 'kurkura', 'lace', 'lays', "lay's", 'layz', 'bingo', 'mad angle', 'mad angles',
      'tedhe medhe', 'takatak', 'crax', 'cheetos', 'doritos', 'pringles',
      'chips', 'potato chips', 'banana chips', 'wafers', 'wafer', 'haldiram bhujia',
      'bhujia', 'aloo bhujia', 'sev bhujia', 'bikanervala bhujia', 'chitale bakrawadi',
      'nachos', 'tortilla chips', 'corn puff', 'salted peanuts pack', 'masala peanuts pack'
    ],
    rationale: 'Google Catalog: Packaged processed chips & fried savory snack (impulse craving / waste spend)',
    category: 'Food & Dining',
  },
  // Aerated Drinks, Sodas, Energy Drinks
  {
    patterns: [
      'coke', 'coca cola', 'pepsi', 'thums up', 'thumps up', 'sprite', 'fanta', 'mirinda',
      'mountain dew', '7up', 'seven up', 'limca', 'sting', 'sting energy', 'red bull',
      'monster energy', 'monster drink', 'cold drink', 'soft drink', 'fizzy drink',
      'aerated drink', 'soda bottle', 'bovonto', 'campa cola'
    ],
    rationale: 'Google Catalog: Carbonated sugary drink / energy soda (nutritionally empty impulse spend)',
    category: 'Food & Dining',
  },
  // Chocolates, Candies, Ice Creams & Desserts
  {
    patterns: [
      'cadbury', 'dairy milk', 'silk', 'kitkat', 'kit kat', '5 star', 'five star', 'munch',
      'perk', 'snickers', 'mars bar', 'bounty', 'toblerone', 'ferrero rocher', 'chocolate',
      'chocolates', 'chocobar', 'candy', 'candies', 'lollipop', 'toffee', 'eclairs',
      'chewing gum', 'bubblegum', 'center fresh', 'center fruit', 'orbit', 'boomer',
      'ice cream', 'icecream', 'magnum', 'cornetto', 'baskin robbins', 'gelato', 'kulfi treat',
      'pastry', 'brownie', 'donut', 'doughnut', 'cupcake', 'waffle treat'
    ],
    rationale: 'Google Catalog: Confectionery & sweet treat (impulse indulgence / waste spend)',
    category: 'Food & Dining',
  },
  // Tobacco, Smoking & Intoxicants
  {
    patterns: [
      'cigarette', 'cigarettes', 'sutta', 'bidi', 'beedi', 'gold flake', 'classic milds',
      'marlboro', 'tobacco', 'pan masala', 'gutkha', 'gutka', 'vimal', 'kamla pasand',
      'rajnigandha', 'shikhar', 'khaini', 'vape', 'vape pod', 'juul', 'e-cigarette',
      'hookah', 'shisha', 'beer', 'whiskey', 'whisky', 'rum', 'vodka', 'gin', 'wine',
      'liquor', 'alcohol', 'old monk', 'tuborg', 'kingfisher', 'carlsberg', 'theka', 'pub bill', 'bar bill'
    ],
    rationale: 'Google Catalog: Tobacco, intoxicant or alcohol purchase (harmful impulse / waste spend)',
    category: 'Other Expense',
  },
  // Gambling, Lottery, Gaming Microtransactions
  {
    patterns: [
      'lottery', 'lottery ticket', 'gambling', 'casino', 'betting', 'dream11', 'my11circle',
      'stake.com', 'stake', 'rummy circle', 'junglee rummy', 'poker chips',
      'in-app purchase', 'game skin', 'game skins', 'pubg uc', 'free fire diamonds',
      'cod points', 'v-bucks', 'fortnite skin', 'roblox robux', 'robux', 'steam game backlog'
    ],
    rationale: 'Google Catalog: Digital microtransaction, game currency or gambling (waste spend)',
    category: 'Entertainment & Movies',
  },
  // Fast food, Pizza, Burgers, Takeout & Craving Indulgence
  {
    patterns: [
      'pizza', 'pizzas', 'dominos', "domino's", 'pizza hut', 'margherita', 'cheese burst',
      'pepperoni', 'pepperoni pizza', 'pizza slice', 'garlic bread', 'burger', 'burgers',
      'mcdonalds', "mcdonald's", 'mcd', 'burger king', 'kfc', 'fried chicken', 'subway',
      'subway sandwich', 'french fries', 'fries', 'peri peri fries', 'momos', 'fried momos',
      'kurkure momos', 'shawarma', 'chicken roll', 'paneer roll', 'spring roll', 'chowmein',
      'noodles takeout', 'fast food', 'junk food', 'street food chaat', 'pani puri', 'golgappa',
      'samosa', 'kachori', 'boba', 'boba tea', 'milkshake', 'thick shake', 'waffle', 'belgian waffle',
      'late night delivery', 'midnight delivery', 'impulse pizza', 'swiggy junk', 'zomato junk',
      'uneaten food', 'discarded food', 'spoiled food', 'wasted food', 'regret purchase',
      'flash sale regret', 'boredom shopping', 'idle gym subscription', 'unused subscription',
      'forgotten subscription'
    ],
    rationale: 'Google Catalog: Pizza & fast food treat (discretionary craving / indulgence — switch to Proper if this was your essential meal!)',
    category: 'Food & Dining',
  },
];

// 2. Proper & Essential Items (Nutrition, Education, Commute, Health, Utilities)
const PROPER_ITEMS: Array<{ patterns: string[]; rationale: string; category: string }> = [
  // Meals, Thalis & Nutritional Sustenance
  {
    patterns: [
      'meal', 'meals', 'thali', 'veg thali', 'non veg thali', 'special thali',
      'lunch', 'dinner', 'breakfast', 'nashta', 'tiffin', 'dabba', 'canteen meal',
      'hostel mess', 'mess fee', 'mess bill', 'hostel food', 'office lunch',
      'roti', 'chapati', 'phulka', 'paratha', 'aloo paratha', 'rice', 'dal', 'dal rice',
      'curry', 'sabji', 'sabzi', 'paneer', 'paneer butter masala', 'paneer sabji',
      'dosa', 'masala dosa', 'plain dosa', 'idli', 'idli sambar', 'vada', 'sambar',
      'poha', 'upma', 'khichdi', 'curd rice', 'chole bhature', 'rajma chawal',
      'egg', 'eggs', 'boiled egg', 'omelette', 'fish curry', 'chicken meal',
      'water bottle', 'bisleri', 'aquafina', 'kinley', 'mineral water', 'water can', 'drinking water'
    ],
    rationale: 'Google Catalog: Nutritional daily meal / essential food sustenance (proper spend)',
    category: 'Food & Dining',
  },
  // Groceries & Cooking Staples
  {
    patterns: [
      'groceries', 'grocery', 'kirana', 'supermarket', 'd-mart', 'dmart', 'blinkit staples',
      'zepto groceries', 'vegetables', 'vegetable', 'sabzi mandi', 'onion', 'potato', 'tomato',
      'fruits', 'fruit', 'apple', 'banana', 'mango', 'papaya', 'oranges',
      'milk', 'amul milk', 'mother dairy', 'nandini milk', 'curd', 'dahi', 'paneer',
      'bread', 'brown bread', 'butter', 'amul butter', 'ghee', 'cooking oil', 'mustard oil',
      'sunflower oil', 'refined oil', 'flour', 'wheat flour', 'atta', 'aashirvaad atta',
      'rice bag', 'basmati rice', 'toor dal', 'moong dal', 'chana dal', 'sugar', 'salt', 'spices', 'tea powder'
    ],
    rationale: 'Google Catalog: Essential household grocery & cooking provisions (proper spend)',
    category: 'Groceries',
  },
  // Education, Study & Stationery
  {
    patterns: [
      'pen', 'pens', 'ball pen', 'gel pen', 'reynolds', 'cello', 'parker', 'pilot pen',
      'pencil', 'pencils', 'apsara pencil', 'natraj pencil', 'eraser', 'sharpener', 'scale', 'ruler',
      'geometry box', 'compass', 'notebook', 'notebooks', 'classmate', 'register', 'rough book',
      'book', 'books', 'textbook', 'textbooks', 'ncert', 'reference book', 'dictionary',
      'stationery', 'stationery item', 'paper bundle', 'a4 sheet', 'a4 paper', 'printout', 'printouts',
      'xerox', 'photocopy', 'lamination', 'binding', 'project file', 'chart paper',
      'tuition', 'tuition fee', 'coaching fee', 'allen', 'fiitjee', 'pw fee', 'physics wallah',
      'school fee', 'college fee', 'university fee', 'exam fee', 'gate fee', 'upsc fee', 'cat fee',
      'school bag', 'school uniform', 'calculator', 'scientific calculator', 'study lamp'
    ],
    rationale: 'Google Catalog: Essential education, stationery & academic study necessity (proper spend)',
    category: 'Stationery & Supplies',
  },
  // Public Transit, Fuel & Daily Commute (including Rapido, Uber, Ola)
  {
    patterns: [
      'rapido', 'rapido bike', 'bike taxi', 'uber', 'ola', 'auto', 'auto fare', 'auto rickshaw',
      'e-rickshaw', 'namma yatri', 'blusmart', 'yulu', 'cab', 'cab fare', 'taxi', 'taxi fare',
      'bus', 'bus fare', 'bus ticket', 'city bus', 'dtc bus', 'bmtc', 'best bus', 'chalo card',
      'metro', 'metro ticket', 'metro card', 'metro recharge', 'dmrc', 'bmrc', 'train',
      'train ticket', 'local train', 'irctc', 'subway', 'commute', 'monthly bus pass',
      'commuter pass', 'toll', 'fastag recharge', 'fuel', 'petrol', 'diesel', 'cng', 'petrol pump', 'shell fuel', 'hp fuel', 'indian oil'
    ],
    rationale: 'Google Catalog: Commute ride / bike taxi travel necessity (Transportation & Metro - Proper Spend)',
    category: 'Transportation & Metro',
  },
  // Healthcare, Pharmacy & Medical
  {
    patterns: [
      'medicine', 'medicines', 'pharmacy', 'chemist', 'apollo pharmacy', 'medplus', 'tata 1mg',
      'doctor', 'doctor fee', 'clinic fee', 'consultation fee', 'hospital', 'hospital bill',
      'paracetamol', 'crocin', 'dolo 650', 'cough syrup', 'antibiotic', 'bandages', 'band-aid',
      'blood test', 'lab test', 'pathology', 'x-ray', 'health checkup', 'dentist fee',
      'spectacles', 'reading glasses', 'contact lens solution', 'first aid'
    ],
    rationale: 'Google Catalog: Critical medical, healthcare & pharmaceutical necessity (proper spend)',
    category: 'Health & Pharmacy',
  },
  // Personal Care, Grooming, Hygiene & Daily Fragrance (Perfume, Deodorant, Skincare)
  {
    patterns: [
      'perfume', 'perfumes', 'cologne', 'eau de parfum', 'eau de toilette', 'deodorant', 'deo',
      'body spray', 'body mist', 'fogg', 'axe spray', 'wild stone', 'nivea deo', 'park avenue deo',
      'engage deo', 'yardley', 'bella vita', 'attar', 'ittar', 'scent', 'perfume bottle',
      'shampoo', 'conditioner', 'soap', 'body wash', 'shower gel', 'face wash', 'facewash',
      'face cream', 'sunscreen', 'moisturizer', 'lotion', 'lip balm', 'vaseline', 'toothpaste',
      'colgate', 'toothbrush', 'floss', 'mouthwash', 'shaving cream', 'shaving foam', 'razor',
      'gillette', 'shaving blade', 'aftershave', 'hair oil', 'coconut oil', 'parachute oil',
      'haircut', 'hair cut', 'salon', 'barber', 'shave', 'parlour', 'grooming', 'trimmer',
      'makeup', 'cosmetics', 'lipstick', 'kajal', 'eyeliner', 'foundation', 'mascara', 'sanitary pads'
    ],
    rationale: 'Google Catalog: Personal hygiene, grooming, skincare & fragrance (Personal Care & Grooming)',
    category: 'Personal Care & Grooming',
  },
  // Essential Apparel, Shoes & Clothing
  {
    patterns: [
      'clothes', 'clothing', 'shirt', 'tshirt', 't-shirt', 'pants', 'trousers', 'jeans',
      'formal wear', 'socks', 'underwear', 'innerwear', 'shoes', 'running shoes', 'sneakers',
      'formal shoes', 'sandals', 'slippers', 'flip flops', 'belt', 'umbrella', 'raincoat'
    ],
    rationale: 'Google Catalog: Essential everyday clothing, footwear or apparel (Shopping & Apparel)',
    category: 'Shopping & Apparel',
  },
  // Everyday Electronics, Mobile Repairs, Tech Accessories & Cables
  {
    patterns: [
      'mobile repair', 'phone repair', 'screen repair', 'screen replacement', 'laptop repair',
      'display replacement', 'battery replacement', 'mobile service', 'phone display',
      'mobile charging port repair', 'screen guard replacement', 'phone fixing',
      'earphones', 'headphones', 'earbuds', 'airpods', 'charger', 'mobile charger', 'phone charger',
      'fast charger', 'usb cable', 'type c cable', 'lightning cable', 'power bank', 'phone cover',
      'mobile case', 'tempered glass', 'screen protector', 'mouse', 'keyboard', 'laptop charger'
    ],
    rationale: 'Google Catalog: Essential device repair, tech maintenance & mobile equipment (Electronics & Gadgets - Proper Spend)',
    category: 'Electronics & Gadgets',
  },
  // Utilities, Bills, Rent & Home Maintenance
  {
    patterns: [
      'rent', 'room rent', 'house rent', 'flat rent', 'hostel rent', 'society maintenance',
      'electricity bill', 'power bill', 'bescom', 'bses', 'tata power', 'mseb',
      'water bill', 'jal board', 'piped gas', 'gas cylinder', 'indane', 'bharat gas', 'hp gas',
      'wifi bill', 'broadband bill', 'airtel broadband', 'jio fiber', 'act broadband',
      'mobile recharge', 'phone recharge', 'airtel recharge', 'jio recharge', 'vi recharge'
    ],
    rationale: 'Google Catalog: Vital living shelter, utility & communication bill (proper spend)',
    category: 'Bills & Utilities',
  },
];

function matchesPattern(text: string, pattern: string): boolean {
  if (text === pattern) return true;
  if (pattern.includes(' ')) {
    return text.includes(pattern);
  }
  const regex = new RegExp(`(^|[^a-z0-9])${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
  return regex.test(text);
}

function getAccountSuggestion(lower: string): 'cash' | 'bank' | null {
  if (lower.includes('cash') || lower.includes('wallet') || lower.includes('chillar') || lower.includes('pocket')) {
    return 'cash';
  }
  if (
    lower.includes('upi') ||
    lower.includes('gpay') ||
    lower.includes('phonepe') ||
    lower.includes('paytm') ||
    lower.includes('bank') ||
    lower.includes('card')
  ) {
    return 'bank';
  }
  return null;
}

export function classifyWithClientCatalog(
  text: string,
  categories: Category[]
): ClientClassificationResult {
  const lower = text.trim().toLowerCase();

  // Find category helper
  const findCat = (preferredName: string) => {
    return categories.find(
      (c) =>
        c.name.toLowerCase().includes(preferredName.toLowerCase()) ||
        preferredName.toLowerCase().includes(c.name.toLowerCase())
    );
  };

  // 1. Check Waste Items (Kurkure, Lay's/Lace, chips, cold drink, etc.)
  for (const item of WASTE_ITEMS) {
    for (const pat of item.patterns) {
      if (matchesPattern(lower, pat)) {
        const cat = findCat(item.category);
        return {
          spendClassification: 'waste_spend',
          categoryMatch: cat ? cat.name : item.category,
          matchedCategory: cat,
          rationale: item.rationale,
          accountSuggestion: getAccountSuggestion(lower),
        };
      }
    }
  }

  // 2. Check Proper Items (Meal, lunch, dinner, thali, pen, perfume, bus fare, milk, etc.)
  for (const item of PROPER_ITEMS) {
    for (const pat of item.patterns) {
      if (matchesPattern(lower, pat)) {
        const cat = findCat(item.category);
        return {
          spendClassification: 'proper_spend',
          categoryMatch: cat ? cat.name : item.category,
          matchedCategory: cat,
          rationale: item.rationale,
          accountSuggestion: getAccountSuggestion(lower),
        };
      }
    }
  }

  // 3. Fallback
  let fallbackName = 'Other Expense';
  if (
    lower.includes('perfume') ||
    lower.includes('cologne') ||
    lower.includes('deo') ||
    lower.includes('scent') ||
    lower.includes('shampoo') ||
    lower.includes('soap') ||
    lower.includes('salon') ||
    lower.includes('grooming') ||
    lower.includes('cream') ||
    lower.includes('cosmetic')
  ) {
    fallbackName = 'Personal Care & Grooming';
  } else if (
    lower.includes('repair') ||
    lower.includes('servicing') ||
    lower.includes('screen') ||
    lower.includes('display') ||
    lower.includes('mobile') ||
    lower.includes('phone') ||
    lower.includes('laptop') ||
    lower.includes('earphone') ||
    lower.includes('headphone') ||
    lower.includes('charger') ||
    lower.includes('cable') ||
    lower.includes('electronic') ||
    lower.includes('gadget')
  ) {
    fallbackName = 'Electronics & Gadgets';
  } else if (
    lower.includes('shirt') ||
    lower.includes('pant') ||
    lower.includes('cloth') ||
    lower.includes('jeans') ||
    lower.includes('shoes') ||
    lower.includes('dress')
  ) {
    fallbackName = 'Shopping & Apparel';
  } else if (
    lower.includes('rapido') ||
    lower.includes('uber') ||
    lower.includes('ola') ||
    lower.includes('bus') ||
    lower.includes('train') ||
    lower.includes('metro') ||
    lower.includes('cab') ||
    lower.includes('auto') ||
    lower.includes('taxi')
  ) {
    fallbackName = 'Transportation & Metro';
  } else if (
    lower.includes('food') ||
    lower.includes('pizza') ||
    lower.includes('burger') ||
    lower.includes('snack') ||
    lower.includes('chai') ||
    lower.includes('coffee')
  ) {
    fallbackName = 'Food & Dining';
  } else if (lower.includes('pen') || lower.includes('stationery') || lower.includes('book')) {
    fallbackName = 'Stationery & Supplies';
  }

  const cat = findCat(fallbackName) || categories[0];
  return {
    spendClassification: 'unclassified',
    categoryMatch: cat ? cat.name : fallbackName,
    matchedCategory: cat,
    rationale: 'Google Catalog: General expenditure (review or decide spend quality)',
    accountSuggestion: getAccountSuggestion(lower),
  };
}
