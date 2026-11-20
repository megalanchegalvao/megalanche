export interface PresentationOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  badge?: string;
  images?: string[];
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  image: string;
  images?: string[];
  available: boolean;
  isPopular?: boolean;
  ingredientsBadge?: string;
  options: PresentationOption[];
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  isActive: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
}

// Identifica se uma foto é "enraizada / fantasma" (fotos mock de flyers, unsplash ou placeholders)
export const isGhostImage = (url?: string): boolean => {
  if (!url || typeof url !== 'string') return true;
  const u = url.trim();
  if (!u) return true;
  if (
    u.includes('unsplash.com') ||
    u.includes('/images/mega/barca-') ||
    u.includes('/images/mega/flyer-') ||
    u.includes('/images/mega/logo-banner.jpg') ||
    u.includes('/images/charneski') ||
    u.includes('palha') ||
    u.includes('placeholder')
  ) {
    return true;
  }
  return false;
};

// Retorna apenas fotos legítimas adicionadas pelo administrador (Supabase Storage, base64 ou URL customizada válida)
export const cleanProductImage = (url?: unknown): string => {
  if (!url || typeof url !== 'string') return '';
  if (isGhostImage(url)) return '';
  return url.trim();
};

// Normaliza qualquer entrada de images (seja array, string única ou null) para um array de URLs válidas
export const normalizeImages = (imgs?: unknown): string[] => {
  if (!imgs) return [];
  if (Array.isArray(imgs)) {
    return imgs.map((img) => cleanProductImage(img)).filter(Boolean);
  }
  if (typeof imgs === 'string' && imgs.trim()) {
    const clean = cleanProductImage(imgs);
    return clean ? [clean] : [];
  }
  return [];
};

export const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: 'cat-todos', name: 'Todos', icon: '/images/mega/logo-oficial.jpg' },
  { id: 'cat-barcas', name: 'Barcas', icon: '' },
  { id: 'cat-lanches', name: 'Lanches', icon: '' },
  { id: 'cat-pasteis', name: 'Pastéis', icon: '' },
  { id: 'cat-bebidas', name: 'Bebidas', icon: '' },
];

export interface StoreInfo {
  name: string;
  tagline: string;
  city: string;
  address: string;
  whatsappNumber: string;
  whatsappDisplay: string;
  pixKey: string;
  pixRaw?: string;
  instagramHandle: string;
  instagramUrl: string;
  logoImage: string;
  topAlertText: string;
  openingHours: string;
  deliveryTimeEstimate?: string;
  pickupTimeEstimate?: string;
  adminPin: string;
}

export interface HeroInfo {
  title: string;
  subtitle: string;
  badge: string;
  image: string;
  promoBannerTag: string;
  promoBannerTitle: string;
  promoBannerSubtitle: string;
  promoBannerButton: string;
}

export const INITIAL_HERO: HeroInfo = {
  title: 'Feito na Hora. Feito para Você.',
  subtitle:
    'Lanches artesanais suculentos, as famosas Barcas completas e pastéis super crocantes. Sabor que faz a diferença!',
  badge: '',
  image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795213073320_n2gd7.jpg',
  promoBannerTag: 'Oferta Especial para Compartilhar',
  promoBannerTitle: 'As Lendárias Barcas do Mega Lanche Galvão!',
  promoBannerSubtitle: 'Lanches artesanais suculentos com porção gigante de batata com queijo derretido, bacon crocante e muito cheddar. Peça agora e receba quentinho!',
  promoBannerButton: 'Ver Barcas',
};

export const INITIAL_STORE_INFO: StoreInfo = {
  name: 'Mega Lanche Galvão',
  tagline: 'Sabor que faz a diferença!',
  city: 'Navegantes - SC',
  address: 'Rua Advogado Arão Rebelo, 1136 - Navegantes - SC',
  whatsappNumber: '5547991108716',
  whatsappDisplay: '(47) 99110-8716',
  pixKey: '69.984.608/0001-02',
  pixRaw: '69984608000102',
  instagramHandle: '@megalanchesgalvao',
  instagramUrl: 'https://www.instagram.com/megalanchesgalvao/#',
  logoImage: '/images/mega/logo-oficial.jpg',
  topAlertText: 'Mega Lanche Galvão • Disk Delivery & Retirada no Balcão!',
  openingHours: 'Segunda a Domingo: 18h00 às 23h30',
  deliveryTimeEstimate: '',
  pickupTimeEstimate: '',
  adminPin: 'Galvao2026On',
};

export const INITIAL_POPULAR_PRODUCT_IDS: string[] = [
  'barca-4g',
  'barca-3g',
  'barca-2g',
  'x-mega',
  'x-frango-catupiry',
  'x-bacon',
];

export const INITIAL_PRODUCTS: Product[] = [
  // --- BARCAS ESPECIAIS ---
  {
    id: 'barca-4g',
    name: 'Barca 4 G (O Gigante da Casa)',
    tagline: '4 Lanches + Batata com Queijo, Bacon e Cheddar',
    description:
      '4 lanches (X-Salada ou X-Burguer à sua escolha), acompanhados de uma enorme porção de batata frita coberta com queijo derretido, cubos crocantes de bacon e muito cheddar cremoso.',
    category: 'Barcas',
    image: '',
    images: [],
    available: true,
    ingredientsBadge: 'Para até 4 pessoas • 4 Lanches',
    options: [
      {
        id: 'barca-4g-padrao',
        name: 'Barca 4 G Completa — R$ 85,00',
        description: '4 lanches X-Salada ou X-Burguer + Batata com queijo, bacon e cheddar.',
        price: 85.0,
        badge: 'Mais Pedida da Galera',
        images: [],
      },
    ],
  },
  {
    id: 'barca-3g',
    name: 'Barca 3 G (com Mini Pastéis)',
    tagline: '2 Lanches + Batata com Queijo, Bacon, Cheddar e Mini Pastelzinho',
    description:
      '2 lanches (X-Salada ou X-Burguer), batata frita bem servida com queijo derretido, bacon crocante, cheddar e mini pastelzinhos crocantes dourados na hora.',
    category: 'Barcas',
    image: '',
    images: [],
    available: true,
    ingredientsBadge: 'Lanches + Batata Cheddar Bacon + Mini Pastéis',
    options: [
      {
        id: 'barca-3g-padrao',
        name: 'Barca 3 G Completa — R$ 75,00',
        description: '2 lanches + Batata cheddar e bacon + Mini pastéis.',
        price: 75.0,
        badge: 'Favorito dos Clientes',
        images: [],
      },
    ],
  },
  {
    id: 'barca-2g',
    name: 'Barca 2 G (com Calabresa)',
    tagline: '2 Lanches + Batata com Queijo, Bacon, Cheddar e Calabresa Acebolada',
    description:
      '2 lanches (X-Salada ou X-Burguer), batata frita crocante com queijo derretido, bacon em cubos, muito cheddar e fatias generosas de calabresa acebolada.',
    category: 'Barcas',
    image: '',
    images: [],
    available: true,
    ingredientsBadge: 'Com calabresa acebolada especial',
    options: [
      {
        id: 'barca-2g-padrao',
        name: 'Barca 2 G Completa — R$ 75,00',
        description: '2 lanches + Batata cheddar bacon + Calabresa acebolada.',
        price: 75.0,
        badge: 'Sensação da Casa',
        images: [],
      },
    ],
  },

  // --- LANCHES TRADICIONAIS E ESPECIAIS ---
  {
    id: 'x-mega',
    name: 'X-Mega (Especial da Casa 👑)',
    tagline: 'O lanche mais completo e caprichado da cidade',
    description:
      'Pão especial quentinho, maionese artesanal da casa, hambúrguer suculento, filé de frango, bacon crocante, calabresa fatiada, ovo, presunto, queijo derretido, alface americana fresca e tomate.',
    category: 'Lanches',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212630531_j1n4z.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212630531_j1n4z.jpg'],
    available: true,
    ingredientsBadge: 'Burger • Frango • Bacon • Calabresa • Ovo • Queijo',
    options: [
      {
        id: 'x-mega-individual',
        name: 'X-Mega — R$ 35,00',
        description: 'Super completo para quem tem fome de verdade.',
        price: 35.0,
        badge: 'Campeão de Vendas',
        images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212630531_j1n4z.jpg'],
      },
    ],
  },
  {
    id: 'x-frango-catupiry',
    name: 'X-Frango com Catupiry',
    tagline: 'Filé de frango macio com muito Catupiry original',
    description:
      'Pão macio, maionese especial, filé de frango suculento, presunto, queijo derretido, catupiry cremoso, alface e tomate.',
    category: 'Lanches',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212525366_3vwis.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212525366_3vwis.jpg'],
    available: true,
    ingredientsBadge: 'Frango suculento & Catupiry cremoso',
    options: [
      {
        id: 'x-frango-catupiry-opt',
        name: 'X-Frango com Catupiry — R$ 30,00',
        description: 'Filé de frango macio e catupiry de verdade.',
        price: 30.0,
        badge: 'Cremoso',
      },
    ],
  },
  {
    id: 'x-bacon',
    name: 'X-Bacon',
    tagline: 'Generosas fatias de bacon crocante',
    description:
      'Pão macio, maionese especial, hambúrguer de primeira, presunto, queijo derretido, muito bacon crocante, alface e tomate.',
    category: 'Lanches',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212357452_mlzqs.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212357452_mlzqs.jpg'],
    available: true,
    ingredientsBadge: 'Bacon crocante & Queijo derretido',
    options: [
      {
        id: 'x-bacon-opt',
        name: 'X-Bacon — R$ 28,00',
        description: 'Para os apaixonados por bacon crocante.',
        price: 28.0,
        badge: 'Popular',
      },
    ],
  },
  {
    id: 'x-frango',
    name: 'X-Frango',
    tagline: 'Filé de frango temperado no ponto',
    description:
      'Pão, maionese especial da casa, filé de frango grelhado e suculento, presunto, queijo derretido, alface fresca e fatias de tomate.',
    category: 'Lanches',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212358544_bne3b.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212358544_bne3b.jpg'],
    available: true,
    options: [
      {
        id: 'x-frango-opt',
        name: 'X-Frango — R$ 28,00',
        description: 'Filé de frango grelhado com queijo e salada.',
        price: 28.0,
      },
    ],
  },
  {
    id: 'x-calabresa',
    name: 'X-Calabresa',
    tagline: 'Calabresa fatiada dourada com queijo',
    description:
      'Pão quentinho, maionese especial, hambúrguer, presunto, queijo derretido, calabresa fatiada acebolada, alface e tomate.',
    category: 'Lanches',
    image: '',
    images: [],
    available: true,
    options: [
      {
        id: 'x-calabresa-opt',
        name: 'X-Calabresa — R$ 28,00',
        description: 'Calabresa fatiada saborosa com hambúrguer e queijo.',
        price: 28.0,
      },
    ],
  },
  {
    id: 'x-egg',
    name: 'X-Egg',
    tagline: 'Com ovo frito perfeito na chapa',
    description:
      'Pão, maionese da casa, hambúrguer, presunto, queijo derretido, ovo frito na chapa no ponto certo, alface fresca e tomate.',
    category: 'Lanches',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212359519_jdnth.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212359519_jdnth.jpg'],
    available: true,
    options: [
      {
        id: 'x-egg-opt',
        name: 'X-Egg — R$ 25,00',
        description: 'O clássico indispensável com ovo e queijo.',
        price: 25.0,
      },
    ],
  },
  {
    id: 'x-salada',
    name: 'X-Salada',
    tagline: 'Leve, clássico e suculento',
    description:
      'Pão, maionese especial da casa, hambúrguer saboroso, presunto, queijo derretido, alface fresca crocante e tomate.',
    category: 'Lanches',
    image: '',
    images: [],
    available: true,
    options: [
      {
        id: 'x-salada-opt',
        name: 'X-Salada — R$ 23,00',
        description: 'O tradicional x-salada perfeito.',
        price: 23.0,
      },
    ],
  },
  {
    id: 'x-burguer',
    name: 'X-Burguer',
    tagline: 'O clássico simples e irresistível',
    description:
      'Pão, maionese especial da casa, hambúrguer suculento, presunto e queijo mussarela derretido.',
    category: 'Lanches',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212361122_o9xdj.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212361122_o9xdj.jpg'],
    available: true,
    options: [
      {
        id: 'x-burguer-opt',
        name: 'X-Burguer — R$ 20,00',
        description: 'Hambúrguer com presunto e queijo derretido.',
        price: 20.0,
      },
    ],
  },

  // --- PASTÉIS CROCANTES ---
  {
    id: 'pastel-carne-queijo',
    name: 'Pastel de Carne com Queijo',
    tagline: 'Recheio farto e massa crocante sequinha',
    description:
      'Massa artesanal frita na hora, super crocante e sequinha, com carne moída bem temperada e queijo mussarela derretido.',
    category: 'Pastéis',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212362670_nkj6g.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212362670_nkj6g.jpg'],
    available: true,
    ingredientsBadge: 'Mais vendido dos pastéis',
    options: [
      {
        id: 'pastel-carne-queijo-opt',
        name: 'Pastel de Carne com Queijo — R$ 15,00',
        description: 'Pastel grande, bem recheado e frito na hora.',
        price: 15.0,
        badge: 'Mais Pedido',
        images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212362670_nkj6g.jpg'],
      },
    ],
  },
  {
    id: 'pastel-frango-catupiry',
    name: 'Pastel de Frango com Catupiry',
    tagline: 'Frango desfiado com Catupiry cremoso',
    description:
      'Pastel sequinho recheado com frango desfiado temperado com ervas especiais e Catupiry cremoso legítimo.',
    category: 'Pastéis',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212363722_k54e6.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212363722_k54e6.jpg'],
    available: true,
    options: [
      {
        id: 'pastel-frango-catupiry-opt',
        name: 'Pastel de Frango com Catupiry — R$ 15,00',
        description: 'Frango desfiado e catupiry cremoso.',
        price: 15.0,
      },
    ],
  },
  {
    id: 'pastel-frango-queijo',
    name: 'Pastel de Frango com Queijo',
    tagline: 'Frango suculento com mussarela puxando',
    description:
      'Pastel frito na hora com recheio de frango suculento bem temperado e queijo mussarela derretido.',
    category: 'Pastéis',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212364736_c13gr.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212364736_c13gr.jpg'],
    available: true,
    options: [
      {
        id: 'pastel-frango-queijo-opt',
        name: 'Pastel de Frango com Queijo — R$ 15,00',
        description: 'Frango e queijo derretido.',
        price: 15.0,
      },
    ],
  },
  {
    id: 'pastel-presunto-queijo',
    name: 'Pastel de Presunto e Queijo',
    tagline: 'O clássico que nunca falha',
    description:
      'Presunto fatiado e bastante queijo mussarela derretido em uma massa estalando de crocante.',
    category: 'Pastéis',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212365691_38dqg.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212365691_38dqg.jpg'],
    available: true,
    options: [
      {
        id: 'pastel-presunto-queijo-opt',
        name: 'Pastel de Presunto e Queijo — R$ 15,00',
        description: 'Presunto e queijo derretido.',
        price: 15.0,
      },
    ],
  },
  {
    id: 'pastel-calabresa-queijo',
    name: 'Pastel de Calabresa com Queijo',
    tagline: 'Calabresa moída/fatiada com queijo derretido',
    description:
      'Pastel recheado com calabresa temperada e bastante queijo mussarela derretido.',
    category: 'Pastéis',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212366536_a0y25.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212366536_a0y25.jpg'],
    available: true,
    options: [
      {
        id: 'pastel-calabresa-queijo-opt',
        name: 'Pastel de Calabresa com Queijo — R$ 15,00',
        description: 'Calabresa saborosa com queijo.',
        price: 15.0,
      },
    ],
  },
  {
    id: 'pastel-queijo',
    name: 'Pastel de Queijo',
    tagline: 'Muito queijo derretido a cada mordida',
    description:
      'Massa sequinha recheada generosamente com queijo mussarela de primeira qualidade.',
    category: 'Pastéis',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212368092_15gwn.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212368092_15gwn.jpg'],
    available: true,
    options: [
      {
        id: 'pastel-queijo-opt',
        name: 'Pastel de Queijo — R$ 13,00',
        description: 'Puro queijo derretido.',
        price: 13.0,
      },
    ],
  },
  {
    id: 'pastel-carne',
    name: 'Pastel de Carne',
    tagline: 'Carne moída especial refogada com carinho',
    description:
      'Pastel tradicional de feira recheado com carne bovina moída refogada com cheiro verde e temperos da casa.',
    category: 'Pastéis',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212369498_4alu2.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212369498_4alu2.jpg'],
    available: true,
    options: [
      {
        id: 'pastel-carne-opt',
        name: 'Pastel de Carne — R$ 12,00',
        description: 'Carne moída tradicional temperada.',
        price: 12.0,
      },
    ],
  },

  // --- BEBIDAS GELADAS ---
  {
    id: 'coca-cola-2l',
    name: 'Coca-Cola 2 Litros',
    tagline: 'Garrafa 2L bem gelada para toda a família',
    description: 'Coca-Cola Original 2L geladíssima.',
    category: 'Bebidas',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212370766_txr3x.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212370766_txr3x.jpg'],
    available: true,
    options: [
      {
        id: 'coca-cola-2l-opt',
        name: 'Coca-Cola 2 Litros — R$ 17,00',
        description: 'Garrafa 2L gelada.',
        price: 17.0,
        badge: 'Ideal para Barcas',
      },
    ],
  },
  {
    id: 'coca-cola-600ml',
    name: 'Coca-Cola 600 ml',
    tagline: 'Garrafa pet 600ml geladíssima',
    description: 'Coca-Cola Original 600ml.',
    category: 'Bebidas',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212371383_fnsl5.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212371383_fnsl5.jpg'],
    available: true,
    options: [
      {
        id: 'coca-cola-600ml-opt',
        name: 'Coca-Cola 600 ml — R$ 10,00',
        description: 'Garrafa pet 600ml.',
        price: 10.0,
      },
    ],
  },
  {
    id: 'coca-cola-lata',
    name: 'Coca-Cola 350 ml (Lata)',
    tagline: 'Lata 350ml trincando de gelada',
    description: 'Coca-Cola lata 350ml geladinha.',
    category: 'Bebidas',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212372282_avfet.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212372282_avfet.jpg'],
    available: true,
    options: [
      {
        id: 'coca-cola-lata-opt',
        name: 'Coca-Cola 350 ml (Lata) — R$ 7,00',
        description: 'Lata 350ml.',
        price: 7.0,
      },
    ],
  },
  {
    id: 'fanta-laranja-lata',
    name: 'Fanta Laranja 350 ml (Lata)',
    tagline: 'Lata 350ml geladíssima',
    description: 'Fanta Laranja lata 350ml.',
    category: 'Bebidas',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212372985_7fcou.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212372985_7fcou.jpg'],
    available: true,
    options: [
      {
        id: 'fanta-laranja-lata-opt',
        name: 'Fanta Laranja 350 ml — R$ 7,00',
        description: 'Lata 350ml.',
        price: 7.0,
      },
    ],
  },
  {
    id: 'agua-com-gas',
    name: 'Água Mineral com Gás 500ml',
    tagline: 'Garrafa 500ml gelada com gás',
    description: 'Água mineral com gás 500ml.',
    category: 'Bebidas',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212374111_lt60b.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212374111_lt60b.jpg'],
    available: true,
    options: [
      {
        id: 'agua-com-gas-opt',
        name: 'Água com Gás 500ml — R$ 5,00',
        description: 'Garrafa 500ml.',
        price: 5.0,
      },
    ],
  },
  {
    id: 'agua-mineral',
    name: 'Água Mineral sem Gás 500ml',
    tagline: 'Garrafa 500ml geladinha',
    description: 'Água mineral pura sem gás 500ml.',
    category: 'Bebidas',
    image: 'https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212374763_6tsjf.jpg',
    images: ['https://ounrfythtkpuldvplhec.supabase.co/storage/v1/object/public/product-images/produto_1795212374763_6tsjf.jpg'],
    available: true,
    options: [
      {
        id: 'agua-mineral-opt',
        name: 'Água sem Gás 500ml — R$ 5,00',
        description: 'Garrafa 500ml.',
        price: 5.0,
      },
    ],
  },
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'cupom-mega10',
    code: 'MEGA10',
    description: '10% de desconto no seu pedido!',
    type: 'percentage',
    value: 10,
    minOrderValue: 30,
    isActive: true,
  },
  {
    id: 'cupom-primeira-compra',
    code: 'BEMVINDO',
    description: 'R$ 5,00 de desconto no primeiro pedido',
    type: 'fixed',
    value: 5,
    minOrderValue: 25,
    isActive: true,
  },
  {
    id: 'cupom-mega-barca',
    code: 'MEGABARCA',
    description: 'R$ 8,00 de desconto especial em Barcas',
    type: 'fixed',
    value: 8,
    minOrderValue: 70,
    isActive: true,
  },
];
