/**
 * Contextual emoji for Kapruka category / subcategory names.
 *
 * Two tiers, verified against the full live category tree (65 top-level,
 * 519 unique names):
 *   1. EXACT — normalized full-name match.
 *   2. KEYWORD — first match in an ordered list (most specific first),
 *      so compound names like "Chocolate and Teddy And Flower" resolve
 *      by their leading concept instead of falling back to 📦.
 */

const norm = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');

const EXACT: Record<string, string> = {
  // ── Top-level catalog ──
  cakes: '🎂', flowers: '💐', chocolates: '🍫', combopack: '🎁',
  grocery: '🛒', electronic: '📱', fashion: '👗', jewellery: '💍',
  cosmetics: '💄', books: '📚', kidstoys: '🧸', softtoy: '🧸',
  sports: '⚽', bicycle: '🚲', automobile: '🚗', babyitems: '🍼',
  greetingcards: '💌', giftcert: '🎫', giftset: '🎁', liquor: '🍷',
  perfumes: '🧴', pet: '🐾', pharmacy: '💊', party: '🎈',
  vegetables: '🥬', fruits: '🍎', household: '🏠', curd: '🥛',
  ayurvedic: '🌿', schoolpride: '🎓', services: '🔧', pirikara: '🙏',
  personalizedgifts: '🎨', food: '🍽️', clothing: '👕', childrens: '🧒',
  adultproducts: '🔞', wholesale: '📦',
  // ── Occasions / collections ──
  birthday: '🎂', anniversary: '💞', valentine: '❤️', wedding: '💒',
  mother: '🌷', fathersday: '👔', childrensday: '🧒', graduation: '🎓',
  christmas: '🎄', diwali: '🪔', halloween: '🎃', newyearjanuary: '🎆',
  thaipongle: '🌾', teachersday: '🍎', womenday: '🌸', corporate: '💼',
  sympathies: '🕊️', sympathy: '🕊️', uniquegifts: '✨', lover: '💘',
  momtobe: '🤰', bridetobe: '👰', youandme: '💑', bestsellers: '🏆',
  newadditions: '🆕', samedaydelivery: '🚀', promotions: '🏷️',
  ornaments: '🪆', offers: '🏷️', seasonal: '🍂', other: '🎁',
  common: '🎁', donation: '🤝', enviornment: '🌍', entertainment: '🎭',
  tickets: '🎟️', tours: '🗺️', translations: '🌐', wine: '🍷',
  beer: '🍺', gummies: '🍬', sponge: '🧽', basket: '🧺', balm: '🪷',
  mugs: '☕', porcelain: '🏺', decorations: '🎊', supplies: '📦',
  stationary: '✏️', magazine: '📰', novel: '📖', reference: '📚',
  astrology: '🔮', cookery: '🍳', biography: '📖', adventure: '🗻',
  preschool: '🎒', puppets: '🎭', dolls: '🪆', gaming: '🎮',
  photography: '📷', gardening: '🪴', plants: '🪴', furniture: '🛋️',
  bedroom: '🛏️', bathware: '🛁', medical: '⚕️', medicine: '💊',
  pills: '💊', capsules: '💊', helmet: '🪖', skateboards: '🛹',
  watches: '⌚', bags: '👜', belts: '👔', headwear: '🧢', saree: '🥻',
  sareeblouse: '🥻', makeup: '💄', umbrellas: '☂️', batteries: '🔋',
  smarthome: '🏠', shirohana: '💐', zellers: '🍰', janet: '💄',
  java: '☕', just: '🍫', divine: '🍫', luvesence: '🧴', chamathka: '💍',
  loveandromance: '❤️', youngandadult: '📖',
  learningandpersonalgrowth: '🌱', maintenanceandcare: '🔧',
  phonecards: '📱', kidsbicycles: '🚲', engineoilsandlubricants: '🛢️',
  eggsandoil: '🥚', newspaperdelivery: '📰',
};

/** Ordered — first match wins. Most specific concepts before generic ones. */
const KEYWORD: Array<[string, string]> = [
  // Brands / shops
  ['cadbury', '🍫'], ['kitkat', '🍫'], ['lindt', '🍫'], ['toblerone', '🍫'],
  ['ferrero', '🍫'], ['godiva', '🍫'], ['hershey', '🍫'], ['snickers', '🍫'],
  ['bounty', '🍫'], ['bueno', '🍫'], ['milka', '🍫'], ['twix', '🍫'],
  ['kandos', '🍫'], ['ritzbury', '🍫'], ['revello', '🍫'], ['mars', '🍫'],
  ['nestle', '🍫'], ['mnm', '🍫'], ['anodscocoa', '🍫'], ['chocolatier', '🍫'],
  ['royalfrench', '🍫'], ['sweetbuds', '🧁'], ['breadtalk', '🥐'],
  ['greencabin', '🍰'], ['caravanfresh', '🥛'], ['tlounge', '🍵'],
  // Hotels & venues
  ['hilton', '🏨'], ['cinnamon', '🏨'], ['marriott', '🏨'], ['ramada', '🏨'],
  ['kingsbury', '🏨'], ['galadari', '🏨'], ['shangri', '🏨'], ['amari', '🏨'],
  ['mountlavinia', '🏨'], ['watersedge', '🏨'], ['mahaweli', '🏨'],
  ['earlsregent', '🏨'], ['nhcollection', '🏨'], ['topaz', '🏨'],
  ['stafford', '🏨'], ['hotel', '🏨'], ['restaurant', '🍽️'],
  // Schools
  ['college', '🎓'], ['lyceum', '🎓'], ['visakha', '🎓'], ['nalanda', '🎓'],
  ['ananda', '🎓'], ['trinity', '🎓'], ['royal', '🎓'], ['school', '🎒'],
  // Jewelers
  ['jewel', '💍'], ['diamond', '💎'], ['gold', '💛'], ['gemand', '💎'],
  ['stonenstring', '📿'], ['swarnamahal', '💍'], ['vogue', '💍'],
  ['raja', '💍'], ['arthur', '💍'], ['mallika', '💍'], ['tashgem', '💎'],
  // Adult (before toys/generic)
  ['bdsm', '🔞'], ['fetish', '🔞'], ['erotic', '🔞'], ['dildo', '🔞'],
  ['vibrator', '🔞'], ['anal', '🔞'], ['adulttoy', '🔞'], ['pleasure', '🔞'],
  ['sexualwellness', '🔞'], ['naughty', '😏'], ['screwyou', '😏'],
  ['intimate', '🩱'],
  // Food & grocery
  ['chocolate', '🍫'], ['cake', '🎂'], ['seafood', '🦐'], ['frozen', '🧊'],
  ['babyfood', '🍼'], ['bakery', '🥐'], ['spread', '🥐'], ['cereal', '🥣'],
  ['beverage', '🥤'], ['cannedfood', '🥫'], ['cleanser', '🧹'],
  ['condiment', '🧂'], ['confectionery', '🍬'], ['dairy', '🧀'],
  ['dessert', '🍮'], ['egg', '🥚'], ['flour', '🌾'],
  ['instantmix', '🥣'], ['globalfood', '🌍'], ['juice', '🧃'],
  ['drink', '🥤'], ['nonalcoholic', '🍇'], ['organic', '🌿'],
  ['homemade', '🏠'], ['pasta', '🍝'], ['noodle', '🍜'],
  ['pestcontrol', '🐛'], ['rice', '🍚'], ['snack', '🍪'], ['sweet', '🍬'],
  ['specialoffer', '🏷️'], ['specialty', '🍽️'], ['spice', '🌶️'],
  ['seasoning', '🌶️'], ['tobacco', '🚬'], ['wellness', '💆'],
  ['baggedfood', '🛍️'], ['healthybundle', '🥗'], ['fruitbasket', '🧺'],
  ['fruit', '🍎'], ['vegetable', '🥬'], ['herb', '🌿'], ['leafy', '🥬'],
  ['whisky', '🥃'], ['brandy', '🥃'], ['champaign', '🍾'], ['vodka', '🍸'],
  ['liquor', '🍷'], ['coffee', '☕'], ['supermarket', '🛒'],
  ['food', '🍽️'],
  // Flowers & greetings
  ['flower', '💐'], ['bouquet', '💐'], ['card', '💌'], ['thankyou', '🙏'],
  ['getwell', '🤒'], ['missyou', '🥺'], ['sorry', '🙇'], ['funny', '😄'],
  ['friendship', '🤝'], ['newborn', '👶'], ['congratulat', '🎉'],
  // Baby & kids
  ['diaper', '🍼'], ['feeding', '🍼'], ['nursing', '🤱'], ['nursery', '🛏️'],
  ['pottytraining', '🚽'], ['babygear', '👶'], ['babycare', '👶'],
  ['babygift', '🎁'], ['maternity', '🤰'], ['momandbaby', '🤱'],
  ['kidsclothing', '👕'], ['kidsshoes', '👟'], ['kidsscooter', '🛴'],
  ['tricycle', '🛴'], ['rideon', '🛴'], ['kidselectric', '🚗'],
  ['plush', '🧸'], ['teddy', '🧸'], ['doll', '🪆'], ['lego', '🧱'],
  ['buildingblock', '🧱'], ['boardgame', '🎲'], ['puzzle', '🧩'],
  ['actionfigure', '🦸'], ['remotecar', '🏎️'], ['diecast', '🏎️'],
  ['hotwheels', '🏎️'], ['toyvehicle', '🚙'], ['outdoortoy', '🪁'],
  ['educational', '🧠'], ['learningtoy', '🧠'], ['musicalinstrument', '🎵'],
  ['cartooncharacter', '🦄'], ['fantasycreature', '🐉'], ['collectible', '🗿'],
  ['dressup', '🎭'], ['roleplaying', '🎭'], ['toybundle', '🧸'],
  ['toy', '🧸'], ['kids', '🧒'],
  // Electronics & tech
  ['mobilephone', '📱'], ['phonecard', '📱'], ['tablet', '📱'],
  ['computer', '💻'], ['camera', '📷'], ['audio', '🎧'], ['video', '📹'],
  ['networking', '📡'], ['wearable', '⌚'], ['smart', '🤖'],
  ['cable', '🔌'], ['charger', '🔌'], ['battery', '🔋'], ['storage', '💾'],
  ['memory', '💾'], ['sewingmachine', '🧵'], ['homeappliance', '🔌'],
  ['kitchenappliance', '🍳'], ['appliance', '🔌'], ['electrical', '💡'],
  ['light', '💡'], ['diy', '🛠️'], ['electronicgift', '📱'],
  ['electronic', '📱'], ['tech', '💻'], ['gadget', '🔌'],
  // Fashion & beauty
  ['mensclothing', '👔'], ['womensclothing', '👗'], ['unisexclothing', '👕'],
  ['activewear', '🏃'], ['sportswear', '🏃'], ['shoe', '👞'],
  ['handbag', '👜'], ['eyewear', '🕶️'], ['apparel', '👕'],
  ['clothing', '👕'], ['fashion', '👗'], ['skincare', '🧴'],
  ['haircare', '💇'], ['nailcare', '💅'], ['bodycare', '🧴'],
  ['personalcare', '🧴'], ['grooming', '🪒'], ['beauty', '💄'],
  ['perfume', '🧴'], ['cologne', '🧴'], ['sunprotection', '🧴'],
  ['womencare', '🌸'], ['womens', '👗'], ['mens', '👔'],
  // Home & household
  ['kitchen', '🍳'], ['dining', '🍽️'], ['laundry', '🧺'],
  ['cleaning', '🧹'], ['homedecor', '🖼️'], ['wallart', '🖼️'],
  ['homeandliving', '🏠'], ['homegarden', '🏡'], ['garden', '🪴'],
  ['tool', '🛠️'], ['machinery', '⚙️'], ['measurement', '📏'],
  ['whiteboard', '📋'], ['safety', '🦺'], ['travel', '🧳'],
  ['home', '🏠'],
  // Health
  ['vitamin', '💊'], ['supplement', '💊'], ['surgical', '⚕️'],
  ['orthopedic', '🦴'], ['boneandjoint', '🦴'], ['pillcontainer', '💊'],
  ['medicalcare', '⚕️'], ['adultcare', '🩺'], ['bathandhygiene', '🛁'],
  ['health', '🩺'], ['ayurved', '🌿'],
  // Vehicles & sports
  ['bicycle', '🚲'], ['bike', '🏍️'], ['motorbike', '🏍️'],
  ['motorpart', '⚙️'], ['engineoil', '🛢️'], ['autocare', '🚗'],
  ['automotive', '🚗'], ['automobile', '🚗'], ['tire', '🛞'],
  ['wheel', '🛞'], ['vehicleservice', '🔧'], ['fitness', '🏋️'],
  ['martialart', '🥋'], ['watersport', '🏊'], ['teamsport', '⚽'],
  ['individualsport', '🎾'], ['trainingaid', '🏋️'], ['sport', '⚽'],
  // Pets
  ['petaccessor', '🐾'], ['pethealth', '🐾'], ['petservice', '🐾'],
  ['livepet', '🐾'], ['foodandtreat', '🦴'], ['pet', '🐾'],
  // Religion & culture
  ['religio', '🙏'], ['worship', '🙏'], ['pirikara', '🙏'],
  ['astrolog', '🔮'], ['sympath', '🕊️'], ['condolence', '🕊️'],
  ['romance', '❤️'],
  // Services
  ['salon', '💇'], ['spas', '💆'], ['courier', '📦'], ['logistic', '🚚'],
  ['newspaper', '📰'], ['legal', '⚖️'], ['tutoring', '📖'],
  ['educationand', '📖'], ['partyservice', '🎈'], ['eventand', '🎪'],
  ['firecracker', '🧨'], ['costume', '🎭'], ['service', '🔧'],
  // Personalized & gifts
  ['personalized', '🎨'], ['custom', '🎨'], ['hamper', '🧺'],
  ['giftset', '🎁'], ['giftcert', '🎫'], ['giftbox', '🎁'],
  ['giftpack', '🎁'], ['giftstationery', '✏️'], ['gift', '🎁'],
  // Books & stationery
  ['book', '📚'], ['fiction', '📖'], ['comic', '💬'], ['academic', '📚'],
  ['textbook', '📚'], ['history', '🏛️'], ['selfhelp', '🌱'],
  ['generalknowledge', '🧠'], ['artdesign', '🎨'], ['architecture', '🏛️'],
  ['artsandcraft', '🎨'], ['hobb', '🎨'], ['cdanddvd', '💿'],
  ['stationery', '✏️'], ['music', '🎵'],
  // Broad fallbacks (keep last)
  ['accessor', '👜'], ['essential', '🧺'], ['occasion', '🎉'],
  ['decor', '🖼️'], ['merchandise', '🛍️'], ['party', '🎈'],
  ['combo', '🎁'], ['bundle', '🎁'], ['wholesale', '📦'],
];

export function getCategoryEmoji(name: string): string {
  const key = norm(name);
  if (EXACT[key]) return EXACT[key];
  for (const [kw, emoji] of KEYWORD) {
    if (key.includes(kw)) return emoji;
  }
  return '🎁';
}
