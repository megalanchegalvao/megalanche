import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  X,
  ArrowRight,
  MapPin,
  Heart,
  MessageCircle,
  Bike,
  Store,
  Tag,
  ChevronRight,
  Navigation,
  Lock,
  Search,
  Bell,
  Menu,
  Home,
  UtensilsCrossed,
  Gift,
  Clock,
  Star,
  CheckCircle2,
  Percent,
  Copy,
  Check,
  Upload,
  FileText,
  Loader2,
  Instagram,
  Flame,
  Coffee,
} from 'lucide-react';
import { StoreProvider, useStore } from './context/StoreContext';
import { type Product, type PresentationOption, type Coupon } from './data/menu';
import { AdminModal } from './components/AdminModal';
import { uploadReceiptToSupabase } from './lib/supabase';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  optionId: string;
  optionName: string;
  price: number;
  quantity: number;
  image: string;
  notes?: string;
  lancheChoices?: string;
}

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}

function AppContent() {
  const { products, categories, storeInfo, heroInfo, coupons, validateCoupon, popularProductIds } = useStore();

  // Estados principais
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [isCouponsModalOpen, setIsCouponsModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Delivery vs Retirada (fica dentro da sacola e checkout)
  const [serviceType, setServiceType] = useState<'delivery' | 'retirada'>('delivery');

  // Filtros & Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Cupons
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleFavorite = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => {
      const next = !prev[productId];
      showToast(next ? 'Adicionado aos favoritos! ❤️' : 'Removido dos favoritos.');
      return { ...prev, [productId]: next };
    });
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotalCartValue = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Produtos filtrados por categoria e termo de busca
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        activeCategory === 'Todos' || p.category.toLowerCase() === activeCategory.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.tagline.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // "Mais Vendidos / Mais Pedidos" (Popular Picks)
  const popularPicks = useMemo(() => {
    if (!popularProductIds || popularProductIds.length === 0) {
      return [];
    }
    return popularProductIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p && p.available));
  }, [products, popularProductIds]);

  const handleApplyCoupon = (code: string) => {
    const res = validateCoupon(code, subtotalCartValue);
    if (res.valid && res.coupon) {
      setAppliedCoupon(res.coupon);
      setCouponDiscount(res.discount);
      showToast(`Cupom ${res.coupon.code} aplicado: - ${formatBRL(res.discount)}!`);
      return { success: true, message: res.message };
    } else {
      return { success: false, message: res.message };
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    showToast('Cupom removido.');
  };

  const handleAddToCart = (
    product: Product,
    option: PresentationOption,
    quantity: number,
    customImage?: string,
    notes?: string,
    lancheChoices?: string
  ) => {
    const itemId = `${product.id}-${option.id}-${lancheChoices || 'default'}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemId);
      if (existing) {
        return prev.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          productId: product.id,
          productName: product.name,
          optionId: option.id,
          optionName: option.name,
          price: option.price,
          quantity: quantity,
          image: customImage || product.image,
          notes: notes?.trim() || undefined,
          lancheChoices: lancheChoices || undefined,
        },
      ];
    });

    if (appliedCoupon) {
      const newSubtotal = subtotalCartValue + option.price * quantity;
      const res = validateCoupon(appliedCoupon.code, newSubtotal);
      if (res.valid) {
        setCouponDiscount(res.discount);
      }
    }

    showToast(`${quantity}x ${product.name} adicionado à sacola! 🛍️`);
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const updated = prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];

      const newSubtotal = updated.reduce((acc, it) => acc + it.price * it.quantity, 0);
      if (appliedCoupon) {
        const res = validateCoupon(appliedCoupon.code, newSubtotal);
        if (res.valid) {
          setCouponDiscount(res.discount);
        } else {
          setAppliedCoupon(null);
          setCouponDiscount(0);
        }
      }
      return updated;
    });
  };

  const removeCartItem = (itemId: string) => {
    setCart((prev) => {
      const updated = prev.filter((item) => item.id !== itemId);
      const newSubtotal = updated.reduce((acc, it) => acc + it.price * it.quantity, 0);
      if (appliedCoupon) {
        const res = validateCoupon(appliedCoupon.code, newSubtotal);
        if (res.valid) {
          setCouponDiscount(res.discount);
        } else {
          setAppliedCoupon(null);
          setCouponDiscount(0);
        }
      }
      return updated;
    });
  };

  const scrollToMenu = () => {
    const el = document.getElementById('cardapio-completo');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col font-sans selection:bg-red-600 selection:text-white pb-20 md:pb-10">

      {/* ===== CABEÇALHO COM LOGO OFICIAL & BUSCA ===== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3 sm:gap-6">

            {/* Menu Hambúrguer */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMenuDrawerOpen(true)}
                className="w-10 h-10 rounded-full bg-stone-50 hover:bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-700 hover:text-red-600 transition-colors"
                aria-label="Abrir Menu"
              >
                <Menu size={20} />
              </button>

              <div className="hidden lg:flex items-center gap-4 text-xs font-bold text-stone-600 pl-2">
                <button
                  onClick={() => {
                    setActiveCategory('Todos');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-red-600 transition-colors"
                >
                  Início
                </button>
                <button onClick={scrollToMenu} className="hover:text-red-600 transition-colors">
                  Cardápio
                </button>
                <button
                  onClick={() => setIsCouponsModalOpen(true)}
                  className="hover:text-red-600 transition-colors flex items-center gap-1"
                >
                  <Gift size={13} className="text-red-600" />
                  <span>Cupons</span>
                </button>
              </div>
            </div>

            {/* LOGO OFICIAL CENTRALIZADA */}
            <button
              onClick={() => {
                setActiveCategory('Todos');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex flex-col items-center cursor-pointer group focus:outline-none"
            >
              <span className="text-[10px] sm:text-[11px] font-semibold text-stone-500 block">
                Olá, Apaixonado por Lanches! 👋
              </span>
              <img
                src={storeInfo.logoImage || '/images/mega/logo-oficial.jpg'}
                alt="Mega Lanche Galvão"
                className="h-11 sm:h-14 md:h-16 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <span className="text-[10px] sm:text-xs text-amber-600 font-bold tracking-wide">
                {storeInfo.tagline}
              </span>
            </button>

            {/* Ações da Direita: Notificações, Sacola e WhatsApp */}
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href={`https://wa.me/${storeInfo.whatsappNumber}?text=Ol%C3%A1%2C+gostaria+de+fazer+um+pedido+no+Mega+Lanche+Galv%C3%A3o%21`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-full text-xs font-bold transition-colors"
              >
                <MessageCircle size={15} />
                <span>Disk WhatsApp</span>
              </a>

              <button
                onClick={() => setIsCouponsModalOpen(true)}
                className="relative w-10 h-10 rounded-full bg-stone-50 hover:bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-700 hover:text-red-600 transition-colors"
                aria-label="Ver Cupons"
              >
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs animate-bounce">
                  3
                </span>
              </button>

              <button
                onClick={() => setIsBagOpen(true)}
                className="relative flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-bold shadow-md shadow-red-500/20 active:scale-95 transition-all"
                aria-label="Ver Sacola"
              >
                <ShoppingBag size={17} />
                <span className="hidden sm:inline">Sacola</span>
                {totalCartCount > 0 && (
                  <span className="bg-white text-red-600 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full">
                    {totalCartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* BARRA DE BUSCA EXPANDIDA COM AS CATEGORIAS ACOMPANHANDO A BARRA */}
          <div className="mt-3.5 pt-3 border-t border-stone-100 space-y-3">

            {/* Campo de Busca */}
            <div className="w-full max-w-2xl mx-auto">
              <div className="bg-stone-100/80 hover:bg-stone-100 rounded-full px-4 py-2.5 shadow-xs border border-stone-200/90 flex items-center gap-2.5 transition-colors">
                <Search size={16} className="text-stone-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar lanche, barca, pastel ou bebida..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-stone-400 hover:text-stone-600 p-0.5"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* CATEGORIAS COM FOTOS CIRCULARES ACOMPANHANDO A BARRA */}
            <div className="flex gap-4 sm:gap-6 items-center justify-start sm:justify-center overflow-x-auto pb-1 no-scrollbar scroll-smooth pt-1">
              {categories.map((cat) => {
                const isSelected = activeCategory === cat.name;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.name);
                      scrollToMenu();
                    }}
                    className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                  >
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-all duration-200 ${
                        isSelected
                          ? 'ring-3 ring-red-600 ring-offset-2 scale-105 shadow-md'
                          : 'opacity-85 group-hover:opacity-100'
                      }`}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-white shadow-xs border border-stone-200 flex items-center justify-center">
                        {cat.icon ? (
                          <img
                            src={cat.icon}
                            alt={cat.name}
                            className="w-full h-full object-cover"
                          />
                        ) : cat.name === 'Barcas' ? (
                          <Flame size={22} className="text-amber-600" />
                        ) : cat.name === 'Lanches' ? (
                          <UtensilsCrossed size={22} className="text-red-600" />
                        ) : cat.name === 'Pastéis' ? (
                          <Sparkles size={22} className="text-amber-500" />
                        ) : cat.name === 'Bebidas' ? (
                          <Coffee size={22} className="text-blue-500" />
                        ) : (
                          <Store size={22} className="text-red-600" />
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'text-red-600 font-bold'
                          : 'text-stone-700 group-hover:text-stone-900'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </header>

      {/* ===== CONTEÚDO PRINCIPAL (100% RESPONSIVO "FORA A FORA") ===== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        {/* ===== HERO BANNER (Sem a flag / badge) ===== */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#FAF0E6] via-[#FFF5EC] to-[#FDE8D4] p-6 sm:p-8 md:p-10 shadow-sm border border-amber-200/70 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">

            {/* Textos do Banner (A FLAG FOI REMOVIDA) */}
            <div className="md:col-span-7 space-y-3 z-10 text-center md:text-left">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-stone-900 leading-tight font-display">
                {heroInfo.title.includes('.') ? (
                  <>
                    {heroInfo.title.split('.')[0]}. <br />
                    <span className="text-red-600">{heroInfo.title.split('.').slice(1).join('.')}</span>
                  </>
                ) : (
                  heroInfo.title
                )}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-stone-600 max-w-lg leading-relaxed font-medium mx-auto md:mx-0">
                {heroInfo.subtitle}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button
                  onClick={scrollToMenu}
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 active:scale-95 transition-transform"
                >
                  <span>Pedir Agora</span>
                  <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => setIsCouponsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-xs transition-colors"
                >
                  <Gift size={15} className="text-red-600" />
                  <span>Ver Cupons</span>
                </button>
              </div>
            </div>

            {/* Imagem do Banner */}
            <div className="md:col-span-5 flex justify-center md:justify-end">
              <div className="relative w-60 sm:w-72 md:w-80 h-60 sm:h-72 md:h-80 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-stone-900">
                <img
                  src={heroInfo.image || '/images/mega/logo-banner.jpg'}
                  alt="Mega Lanche Galvão"
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 text-center text-white text-xs font-bold drop-shadow-sm">
                  {storeInfo.tagline} 👑
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== SEÇÃO: MAIS VENDIDOS / MAIS PEDIDOS ===== */}
        {activeCategory === 'Todos' && !searchQuery && popularPicks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 text-base sm:text-xl font-display flex items-center gap-2">
                <span>Mais Vendidos 🔥</span>
                <span className="text-xs font-normal text-stone-500 hidden sm:inline">
                  (Os favoritos dos nossos clientes)
                </span>
              </h3>
              <button
                onClick={scrollToMenu}
                className="text-red-600 text-xs sm:text-sm font-bold hover:underline flex items-center gap-0.5"
              >
                Ver Todos <ChevronRight size={15} />
              </button>
            </div>

            {/* Grid Responsivo para Mais Pedidos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {popularPicks.map((product) => {
                const defaultOpt = product.options[0];
                const isFav = !!favorites[product.id];

                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProductForModal(product)}
                    className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-xs border border-stone-200/80 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-red-300 transition-all group"
                  >
                    {/* Header do Card: Badge + Favorito */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-red-600 text-white text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full truncate max-w-[70%]">
                        {product.category === 'Barcas' ? 'SUPER BARCA' : 'POPULAR'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(product.id, e)}
                        className="w-7 h-7 rounded-full bg-stone-50 hover:bg-red-50 flex items-center justify-center text-stone-400 hover:text-red-600 transition-colors"
                      >
                        <Heart
                          size={14}
                          className={isFav ? 'fill-red-600 text-red-600' : ''}
                        />
                      </button>
                    </div>

                    {/* Imagem do Produto */}
                    <div className="w-full h-28 sm:h-36 rounded-xl overflow-hidden bg-stone-50 mb-2 flex items-center justify-center">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 p-2">
                          <UtensilsCrossed size={24} className="text-stone-300 mb-1" />
                          <span className="text-[10px] text-stone-400 font-semibold text-center line-clamp-1">{product.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Informações */}
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs sm:text-sm text-stone-900 line-clamp-1 leading-snug">
                        {product.name}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-stone-500 line-clamp-2 leading-tight">
                        {product.tagline}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-amber-600 font-semibold pt-0.5">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span>4.9 (1.2k+)</span>
                      </div>
                    </div>

                    {/* Preço e Botão Adicionar (+) */}
                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-stone-100">
                      <span className="font-extrabold text-sm sm:text-base text-stone-900 font-display">
                        {formatBRL(defaultOpt?.price || 0)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProductForModal(product);
                        }}
                        className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xs active:scale-95 transition-transform"
                        aria-label={`Adicionar ${product.name}`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== BANNER DA OFERTA DE BARCAS COM DISK DELIVERY ===== */}
        <div className="rounded-3xl bg-gradient-to-r from-red-600 via-red-600 to-amber-600 text-white p-6 sm:p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left max-w-xl">
            <span className="inline-flex items-center gap-1.5 bg-white/20 text-amber-300 font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full">
              <Percent size={13} /> {heroInfo.promoBannerTag || 'Oferta Especial para Compartilhar'}
            </span>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black font-display leading-tight">
              {heroInfo.promoBannerTitle || 'As Lendárias Barcas do Mega Lanche Galvão!'}
            </h3>
            <p className="text-xs sm:text-sm text-white/90">
              {heroInfo.promoBannerSubtitle || 'Lanches artesanais suculentos com porção gigante de batata com queijo derretido, bacon crocante e muito cheddar. Peça agora e receba quentinho!'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveCategory('Barcas');
                scrollToMenu();
              }}
              className="bg-white text-red-700 hover:bg-stone-100 text-xs sm:text-sm font-extrabold px-6 py-3 rounded-full shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <span>{heroInfo.promoBannerButton || 'Ver Barcas'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* ===== SEÇÃO: CARDÁPIO COMPLETO ===== */}
        <div id="cardapio-completo" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
            <div>
              <h2 className="font-black text-stone-900 text-xl sm:text-2xl font-display">
                {activeCategory === 'Todos' ? 'Cardápio Completo' : activeCategory}
              </h2>
              <span className="text-xs sm:text-sm text-stone-500">
                Exibindo {filteredProducts.length} itens deliciosos
              </span>
            </div>

            {/* Abas Rápidas no topo do cardápio */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.name)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    activeCategory === c.name
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Todos os Produtos do Cardápio: 2 em 2 em celular */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((product) => {
              const defaultOpt = product.options[0];
              const isFav = !!favorites[product.id];

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProductForModal(product)}
                  className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-xs border border-stone-200/80 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-red-300 transition-all group"
                >
                  <div>
                    {/* Imagem do Produto com Tag de Ingredientes */}
                    <div className="w-full h-28 sm:h-36 rounded-xl overflow-hidden bg-stone-100 relative mb-2 flex items-center justify-center">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 p-2">
                          <UtensilsCrossed size={24} className="text-stone-300 mb-1" />
                          <span className="text-[10px] text-stone-400 font-semibold text-center line-clamp-1">{product.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(product.id, e)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-stone-400 hover:text-red-600 transition-colors shadow-xs"
                      >
                        <Heart
                          size={13}
                          className={isFav ? 'fill-red-600 text-red-600' : ''}
                        />
                      </button>
                      {product.ingredientsBadge && (
                        <div className="absolute bottom-1 left-1 right-1 bg-black/70 backdrop-blur-xs text-white text-[8px] font-semibold px-1 py-0.5 rounded text-center truncate">
                          {product.ingredientsBadge}
                        </div>
                      )}
                    </div>

                    {/* Informações */}
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs sm:text-sm text-stone-900 line-clamp-1 leading-snug">
                        {product.name}
                      </h4>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-red-600 block line-clamp-1">
                        {product.tagline}
                      </span>
                      <p className="text-[10px] sm:text-xs text-stone-500 line-clamp-2 mt-0.5 leading-tight">
                        {product.description}
                      </p>
                    </div>
                  </div>

                  {/* Linha de Preço & Botão */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-stone-100">
                    <div>
                      <span className="font-extrabold text-xs sm:text-sm text-stone-900 font-display">
                        {formatBRL(defaultOpt?.price || 0)}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProductForModal(product);
                      }}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xs active:scale-95 transition-transform"
                      aria-label={`Pedir ${product.name}`}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== RODAPÉ INSTITUCIONAL COM HORÁRIOS ===== */}
        <footer className="rounded-3xl bg-stone-900 text-white p-6 sm:p-8 md:p-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">

            {/* Identidade */}
            <div className="space-y-3">
              <img
                src={storeInfo.logoImage || '/images/mega/logo-oficial.jpg'}
                alt="Mega Lanche Galvão"
                className="h-16 w-auto object-contain bg-white rounded-xl p-1"
              />
              <p className="text-xs text-stone-300 leading-relaxed">
                O melhor da lanchonete artesanal para você. Barcas completas, lanches prensados suculentos e pastéis fritos na hora com carinho e qualidade.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-amber-400 text-xs font-bold">
                  ★ Sabor que faz a diferença!
                </span>
              </div>
            </div>

            {/* Horários & Atendimento */}
            <div className="space-y-3 text-xs text-stone-300">
              <h4 className="font-extrabold text-sm text-white uppercase tracking-wider font-display">
                Atendimento
              </h4>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-400 shrink-0" />
                <span>{storeInfo.openingHours || 'Segunda a Domingo: 18h00 às 23h30'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Bike size={16} className="text-red-500 shrink-0" />
                <span>Disk Delivery Navegantes</span>
              </div>
              <div className="flex items-center gap-2">
                <Store size={16} className="text-amber-400 shrink-0" />
                <span>Retirada: {storeInfo.address || 'Rua Advogado Arão Rebelo, 1136 - Navegantes - SC'}</span>
              </div>
            </div>

            {/* Contato Direto */}
            <div className="space-y-3 text-xs text-stone-300">
              <h4 className="font-extrabold text-sm text-white uppercase tracking-wider font-display">
                Peça Direto
              </h4>
              <p>Dúvidas ou pedidos especiais? Fale conosco:</p>
              <a
                href={`https://wa.me/${storeInfo.whatsappNumber}?text=Ol%C3%A1%2C+gostaria+de+fazer+um+pedido+no+Mega+Lanche+Galv%C3%A3o%21`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-full shadow-md transition-colors"
              >
                <MessageCircle size={16} />
                <span>{storeInfo.whatsappDisplay}</span>
              </a>
              <a
                href={storeInfo.instagramUrl || 'https://www.instagram.com/megalanchesgalvao/#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white font-bold px-4 py-2.5 rounded-full shadow-md transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}
              >
                <Instagram size={16} />
                <span>{storeInfo.instagramHandle || '@megalanchesgalvao'}</span>
              </a>
              <div className="pt-2">
                <button
                  onClick={() => setIsAdminOpen(true)}
                  className="text-stone-500 hover:text-stone-300 text-[11px] flex items-center gap-1.5"
                >
                  <Lock size={12} />
                  <span>Acesso do Administrador</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800 text-center text-xs text-stone-500">
            © {new Date().getFullYear()} Mega Lanche Galvão. Todos os direitos reservados.
          </div>
        </footer>

      </main>

      {/* ===== BARRA INFERIOR FIXA DE NAVEGAÇÃO MOBILE/TABLET ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 shadow-lg px-6 py-2.5 flex items-center justify-between">
        {/* Início */}
        <button
          onClick={() => {
            setActiveCategory('Todos');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-1 text-red-600 focus:outline-none"
        >
          <Home size={20} />
          <span className="text-[10px] font-bold">Início</span>
        </button>

        {/* Cardápio */}
        <button
          onClick={scrollToMenu}
          className="flex flex-col items-center gap-1 text-stone-500 hover:text-stone-900 focus:outline-none"
        >
          <UtensilsCrossed size={20} />
          <span className="text-[10px] font-semibold">Cardápio</span>
        </button>

        {/* BOTÃO CENTRAL ELEVADO DA SACOLA */}
        <div className="relative -top-5">
          <button
            onClick={() => setIsBagOpen(true)}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/40 border-4 border-[#FAF9F6] flex flex-col items-center justify-center active:scale-95 transition-transform"
            aria-label="Abrir Sacola de Pedido"
          >
            <ShoppingBag size={20} />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-stone-900 font-black text-[10px] rounded-full flex items-center justify-center border-2 border-white">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>

        {/* Cupons */}
        <button
          onClick={() => setIsCouponsModalOpen(true)}
          className="flex flex-col items-center gap-1 text-stone-500 hover:text-stone-900 focus:outline-none"
        >
          <Gift size={20} />
          <span className="text-[10px] font-semibold">Cupons</span>
        </button>

        {/* Menu Lateral */}
        <button
          onClick={() => setIsMenuDrawerOpen(true)}
          className="flex flex-col items-center gap-1 text-stone-500 hover:text-stone-900 focus:outline-none"
        >
          <Menu size={20} />
          <span className="text-[10px] font-semibold">Mais</span>
        </button>
      </nav>

      {/* ===== TOAST FLUTUANTE ===== */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-stone-900/95 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-stone-700/50 flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ===== MODAL DE DETALHES & CUSTOMIZAÇÃO DO PRODUTO ===== */}
      {selectedProductForModal && (
        <ProductDetailModal
          product={selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
          onAddToCart={(product, option, qty, img, notes, lancheChoices) => {
            handleAddToCart(product, option, qty, img, notes, lancheChoices);
            setSelectedProductForModal(null);
          }}
        />
      )}

      {/* ===== GAVETA DA SACOLA COM SELETOR DE DELIVERY / RETIRADA DENTRO DELA ===== */}
      <BagDrawer
        isOpen={isBagOpen}
        items={cart}
        serviceType={serviceType}
        onSetServiceType={setServiceType}
        appliedCoupon={appliedCoupon}
        couponDiscount={couponDiscount}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeCartItem}
        onClose={() => setIsBagOpen(false)}
        onCheckout={() => {
          setIsBagOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* ===== MODAL DE CHECKOUT (WhatsApp Order) ===== */}
      {isCheckoutOpen && (
        <CheckoutModal
          items={cart}
          appliedCoupon={appliedCoupon}
          couponDiscount={couponDiscount}
          defaultServiceType={serviceType}
          onClose={() => setIsCheckoutOpen(false)}
          onOrderSent={() => {
            setCart([]);
            setAppliedCoupon(null);
            setCouponDiscount(0);
            setIsCheckoutOpen(false);
            showToast('Pedido gerado com sucesso! Abrindo o WhatsApp...');
          }}
        />
      )}

      {/* ===== MODAL DE CUPONS ===== */}
      {isCouponsModalOpen && (
        <CouponsModal
          coupons={coupons}
          onApply={(code) => {
            const res = handleApplyCoupon(code);
            if (res.success) {
              setIsCouponsModalOpen(false);
            }
          }}
          onClose={() => setIsCouponsModalOpen(false)}
        />
      )}

      {/* ===== MENU LATERAL / DRAWER ===== */}
      {isMenuDrawerOpen && (
        <SideMenuDrawer
          storeInfo={storeInfo}
          onClose={() => setIsMenuDrawerOpen(false)}
          onOpenAdmin={() => {
            setIsMenuDrawerOpen(false);
            setIsAdminOpen(true);
          }}
          onOpenCoupons={() => {
            setIsMenuDrawerOpen(false);
            setIsCouponsModalOpen(true);
          }}
        />
      )}

      {/* ===== MODAL ADMIN ===== */}
      {isAdminOpen && (
        <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      )}

    </div>
  );
}

// ==========================================
// COMPONENTE: MODAL DE DETALHES DO PRODUTO
// ==========================================
function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
}: {
  product: Product;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    option: PresentationOption,
    quantity: number,
    image?: string,
    notes?: string,
    lancheChoices?: string
  ) => void;
}) {
  const options = product.options && product.options.length > 0 ? product.options : [
    { id: 'padrao', name: 'Padrão', price: 20 },
  ];

  const [selectedOption, setSelectedOption] = useState<PresentationOption>(options[0]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Para Barcas: escolha dos lanches (X-Salada ou X-Burguer)
  const isBarca = product.category === 'Barcas';
  const isBarca4G = product.id === 'barca-4g';
  const [lanche1, setLanche1] = useState('X-Salada');
  const [lanche2, setLanche2] = useState('X-Burguer');
  const [lanche3, setLanche3] = useState('X-Salada');
  const [lanche4, setLanche4] = useState('X-Burguer');

  const lancheChoicesText = useMemo(() => {
    if (!isBarca) return undefined;
    if (isBarca4G) {
      return `Lanches: 1º ${lanche1}, 2º ${lanche2}, 3º ${lanche3}, 4º ${lanche4}`;
    }
    return `Lanches: 1º ${lanche1}, 2º ${lanche2}`;
  }, [isBarca, isBarca4G, lanche1, lanche2, lanche3, lanche4]);

  const total = selectedOption.price * quantity;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto shadow-2xl modal-enter flex flex-col">

        {/* Imagem do Produto no Topo com Botão Fechar */}
        {(selectedOption.images?.[0] || product.image) ? (
          <div className="relative h-60 w-full bg-stone-100 shrink-0">
            <img
              src={selectedOption.images?.[0] || product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {product.category}
            </div>
          </div>
        ) : (
          <div className="p-5 pb-0 flex items-center justify-between border-b border-stone-100">
            <div className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {product.category}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Detalhes do Produto */}
        <div className="p-5 space-y-4 flex-1">
          <div>
            <h3 className="font-extrabold text-lg text-stone-900 font-display">
              {product.name}
            </h3>
            <p className="text-xs text-red-600 font-bold mt-0.5">
              {product.tagline}
            </p>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Escolha de Opção se houver mais de uma */}
          {options.length > 1 && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="text-xs font-bold text-stone-800">
                Selecione a opção:
              </label>
              <div className="space-y-1.5">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOption(opt)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                      selectedOption.id === opt.id
                        ? 'border-red-600 bg-red-50/50 text-red-900'
                        : 'border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span>{opt.name}</span>
                    <span className="font-bold text-red-600">
                      {formatBRL(opt.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Configuração de Lanches da Barca */}
          {isBarca && (
            <div className="space-y-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
              <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>🥪 Escolha os Lanches da Barca:</span>
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-stone-600 block mb-1">
                    Lanche 1:
                  </span>
                  <select
                    value={lanche1}
                    onChange={(e) => setLanche1(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg p-1.5 text-xs text-stone-800 focus:outline-none"
                  >
                    <option value="X-Salada">X-Salada</option>
                    <option value="X-Burguer">X-Burguer</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-600 block mb-1">
                    Lanche 2:
                  </span>
                  <select
                    value={lanche2}
                    onChange={(e) => setLanche2(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg p-1.5 text-xs text-stone-800 focus:outline-none"
                  >
                    <option value="X-Salada">X-Salada</option>
                    <option value="X-Burguer">X-Burguer</option>
                  </select>
                </div>
                {isBarca4G && (
                  <>
                    <div>
                      <span className="text-[10px] font-bold text-stone-600 block mb-1">
                        Lanche 3:
                      </span>
                      <select
                        value={lanche3}
                        onChange={(e) => setLanche3(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-lg p-1.5 text-xs text-stone-800 focus:outline-none"
                      >
                        <option value="X-Salada">X-Salada</option>
                        <option value="X-Burguer">X-Burguer</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-stone-600 block mb-1">
                        Lanche 4:
                      </span>
                      <select
                        value={lanche4}
                        onChange={(e) => setLanche4(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-lg p-1.5 text-xs text-stone-800 focus:outline-none"
                      >
                        <option value="X-Salada">X-Salada</option>
                        <option value="X-Burguer">X-Burguer</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Campo de Observações */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-semibold text-stone-700">
              Observações (opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Sem cebola, carne bem passada, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Controles de Quantidade & Botão Adicionar */}
          <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
            <div className="flex items-center rounded-full border border-stone-300 p-1 bg-stone-50 shrink-0">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-700 hover:bg-stone-200"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-xs font-bold text-stone-900">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-700 hover:bg-stone-200"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              onClick={() =>
                onAddToCart(
                  product,
                  selectedOption,
                  quantity,
                  selectedOption.images?.[0] || product.image,
                  notes,
                  lancheChoicesText
                )
              }
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-full text-xs shadow-md shadow-red-500/30 flex items-center justify-between"
            >
              <span>Adicionar à Sacola</span>
              <span className="font-extrabold">{formatBRL(total)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE: GAVETA DA SACOLA (BAG DRAWER)
// COM O SELETOR DE DELIVERY / RETIRADA DENTRO DELA!
// ==========================================
function BagDrawer({
  isOpen,
  items,
  serviceType,
  onSetServiceType,
  appliedCoupon,
  couponDiscount,
  onApplyCoupon,
  onRemoveCoupon,
  onUpdateQuantity,
  onRemoveItem,
  onClose,
  onCheckout,
}: {
  isOpen: boolean;
  items: CartItem[];
  serviceType: 'delivery' | 'retirada';
  onSetServiceType: (type: 'delivery' | 'retirada') => void;
  appliedCoupon: Coupon | null;
  couponDiscount: number;
  onApplyCoupon: (code: string) => { success: boolean; message: string };
  onRemoveCoupon: () => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClose: () => void;
  onCheckout: () => void;
}) {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - couponDiscount);

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = onApplyCoupon(couponInput.trim());
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponError(null);
      setCouponInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col cart-enter">

        {/* Header da Sacola */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-red-600" />
            <h3 className="font-extrabold text-base text-stone-900 font-display">
              Sua Sacola
            </h3>
            <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-500 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* SELETOR DE ATENDIMENTO EXCLUSIVO DENTRO DA SACOLA */}
        <div className="p-4 border-b border-stone-100 bg-stone-50/60">
          <label className="text-[11px] font-bold text-stone-600 block mb-1.5">
            Como deseja receber seu pedido?
          </label>
          <div className="p-1 bg-stone-200/70 rounded-full flex text-xs font-semibold">
            <button
              type="button"
              onClick={() => onSetServiceType('delivery')}
              className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all ${
                serviceType === 'delivery'
                  ? 'bg-red-600 text-white shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Bike size={14} />
              <span>Delivery</span>
            </button>
            <button
              type="button"
              onClick={() => onSetServiceType('retirada')}
              className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all ${
                serviceType === 'retirada'
                  ? 'bg-red-600 text-white shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Store size={14} />
              <span>Retirada</span>
            </button>
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                <ShoppingBag size={28} />
              </div>
              <h4 className="font-bold text-stone-800">Sua sacola está vazia</h4>
              <p className="text-xs text-stone-500 max-w-xs">
                Adicione um hambúrguer artesanal, uma barca ou um pastel crocante!
              </p>
              <button
                onClick={onClose}
                className="mt-2 text-xs font-bold bg-red-600 text-white px-5 py-2.5 rounded-full"
              >
                Ver Cardápio
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex gap-3"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-16 h-16 rounded-xl object-cover bg-white shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                    <UtensilsCrossed size={18} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h5 className="font-bold text-xs text-stone-900 leading-snug">
                      {item.productName}
                    </h5>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-[10px] text-red-600 hover:underline font-semibold"
                    >
                      Remover
                    </button>
                  </div>
                  {item.lancheChoices && (
                    <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                      {item.lancheChoices}
                    </span>
                  )}
                  {item.notes && (
                    <span className="text-[10px] text-stone-500 italic block">
                      Obs: {item.notes}
                    </span>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-stone-300 bg-white p-0.5">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-100"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-stone-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-100"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                    <span className="font-extrabold text-xs text-stone-900">
                      {formatBRL(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé com Cupons e Botão Finalizar */}
        {items.length > 0 && (
          <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">

            {/* Cupom */}
            {appliedCoupon ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Tag size={13} className="text-emerald-600" />
                  <span className="font-bold text-emerald-800">{appliedCoupon.code}</span>
                  <span className="text-emerald-700">(-{formatBRL(couponDiscount)})</span>
                </div>
                <button
                  onClick={onRemoveCoupon}
                  className="text-emerald-800 font-bold hover:underline text-[11px]"
                >
                  Remover
                </button>
              </div>
            ) : (
              <form onSubmit={handleCouponSubmit} className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Código do cupom..."
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none uppercase"
                  />
                  <button
                    type="submit"
                    className="bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold px-3 py-2 rounded-xl"
                  >
                    Aplicar
                  </button>
                </div>
                {couponError && (
                  <p className="text-[10px] text-red-600 font-medium">{couponError}</p>
                )}
              </form>
            )}

            {/* Totais */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Desconto cupom</span>
                  <span>- {formatBRL(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-900 font-black text-base pt-1 border-t border-stone-200">
                <span>Total ({serviceType === 'delivery' ? 'Delivery' : 'Retirada'})</span>
                <span>{formatBRL(total)}</span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-full text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <span>Finalizar Pedido</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE: MODAL DE CHECKOUT (WHATSAPP)
// ==========================================
function CheckoutModal({
  items,
  appliedCoupon,
  couponDiscount,
  defaultServiceType,
  onClose,
  onOrderSent,
}: {
  items: CartItem[];
  appliedCoupon: Coupon | null;
  couponDiscount: number;
  defaultServiceType: 'delivery' | 'retirada';
  onClose: () => void;
  onOrderSent: () => void;
}) {
  const { storeInfo } = useStore();

  const [deliveryType, setDeliveryType] = useState<'delivery' | 'retirada'>(defaultServiceType);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'dinheiro'>('pix');
  const [pixMode, setPixMode] = useState<'upload' | 'whatsapp'>('upload');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Geolocalização GPS
  const [isLocating, setIsLocating] = useState(false);
  const [gpsUrl, setGpsUrl] = useState<string | null>(null);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - couponDiscount);

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      alert('Seu navegador não suporta GPS.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        setGpsUrl(url);
      },
      () => {
        setIsLocating(false);
        alert('Não foi possível obter a localização. Preencha o endereço manualmente.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
    } else {
      setReceiptPreview(null);
    }
  };

  const handleCopyPixKey = () => {
    const rawKey = storeInfo.pixRaw || '69984608000102';
    navigator.clipboard.writeText(rawKey);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  };

  const handleSendWhatsAppOrder = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Informe seu nome para o pedido.';
    if (deliveryType === 'delivery' && !address.trim() && !gpsUrl) {
      errs.address = 'Informe a rua/endereço ou compartilhe o GPS.';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    let receiptUrl = '';
    if (paymentMethod === 'pix' && pixMode === 'upload' && receiptFile) {
      setIsUploadingReceipt(true);
      try {
        const res = await uploadReceiptToSupabase(receiptFile);
        receiptUrl = res.url;
      } catch (err) {
        console.warn('Erro ao carregar comprovante:', err);
      } finally {
        setIsUploadingReceipt(false);
      }
    }

    // Montagem da mensagem do WhatsApp formatada
    const lines: string[] = [];
    lines.push(`*PEDIDO — MEGA LANCHE GALVÃO*`);
    lines.push(`----------------------------------------`);
    lines.push(`*Cliente:* ${name.trim()}`);
    if (phone.trim()) lines.push(`*Telefone:* ${phone.trim()}`);
    lines.push(`*Forma:* ${deliveryType === 'delivery' ? 'Delivery (Entrega)' : 'Retirada no Local'}`);

    if (deliveryType === 'delivery') {
      if (address.trim()) {
        lines.push(`*Endereço:* ${address.trim()}${number ? `, Nº ${number}` : ''}`);
      }
      if (neighborhood.trim()) lines.push(`*Bairro:* ${neighborhood.trim()}`);
      if (reference.trim()) lines.push(`*Referência:* ${reference.trim()}`);
      if (gpsUrl) lines.push(`*Localização GPS:* ${gpsUrl}`);
    } else {
      lines.push(`*Retirada:* Balcão Mega Lanche Galvão`);
      lines.push(`*Endereço da Loja:* ${storeInfo.address || 'Rua Advogado Arão Rebelo, 1136 - Navegantes - SC'}`);
    }

    lines.push(`----------------------------------------`);
    lines.push(`*ITENS DO PEDIDO:*`);
    items.forEach((item) => {
      lines.push(`• *${item.quantity}x* ${item.productName}`);
      if (item.lancheChoices) lines.push(`   └ ${item.lancheChoices}`);
      if (item.notes) lines.push(`   └ Obs: ${item.notes}`);
      lines.push(`   Valor: ${formatBRL(item.price * item.quantity)}`);
    });

    lines.push(`----------------------------------------`);
    lines.push(`*Subtotal:* ${formatBRL(subtotal)}`);
    if (couponDiscount > 0 && appliedCoupon) {
      lines.push(`*Cupom (${appliedCoupon.code}):* - ${formatBRL(couponDiscount)}`);
    }
    lines.push(`*TOTAL A PAGAR:* ${formatBRL(total)}`);

    if (paymentMethod === 'pix') {
      lines.push(`*Forma de Pagamento:* Pix (CNPJ: ${storeInfo.pixKey || '69.984.608/0001-02'})`);
      if (receiptUrl) {
        lines.push(`*Comprovante Pix:* ${receiptUrl}`);
      } else if (pixMode === 'upload' && receiptFile) {
        lines.push(`*Comprovante Pix:* (Anexo gerado: ${receiptFile.name})`);
      } else {
        lines.push(`*Comprovante Pix:* (Enviarei a foto/print a seguir nesta conversa)`);
      }
    } else if (paymentMethod === 'cartao') {
      lines.push(`*Forma de Pagamento:* Cartão (Maquininha na entrega/retirada)`);
    } else if (paymentMethod === 'dinheiro') {
      lines.push(`*Forma de Pagamento:* Dinheiro${changeFor ? ` (Troco para R$ ${changeFor})` : ' (Sem troco)'}`);
    }

    if (notes.trim()) {
      lines.push(`*Observações:* ${notes.trim()}`);
    }

    lines.push(`----------------------------------------`);
    lines.push(`Aguardando confirmação! Obrigado!`);

    const encoded = encodeURIComponent(lines.join('\n'));
    const url = `https://wa.me/${storeInfo.whatsappNumber}?text=${encoded}`;
    window.open(url, '_blank');
    onOrderSent();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col modal-enter">

        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-stone-900 font-display">
              Finalizar Pedido
            </h3>
            <span className="text-xs text-stone-500">
              Mega Lanche Galvão • Disk Delivery & Retirada
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-500 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário de Finalização */}
        <div className="p-5 space-y-4 text-xs">

          {/* Tipo de Atendimento */}
          <div className="bg-stone-100 p-1 rounded-xl flex font-semibold">
            <button
              onClick={() => setDeliveryType('delivery')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                deliveryType === 'delivery'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-stone-600'
              }`}
            >
              <Bike size={14} />
              <span>Delivery</span>
            </button>
            <button
              onClick={() => setDeliveryType('retirada')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                deliveryType === 'retirada'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-stone-600'
              }`}
            >
              <Store size={14} />
              <span>Retirada</span>
            </button>
          </div>

          {/* Dados do Cliente */}
          <div className="space-y-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Seu Nome Completo *
              </label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-red-600"
              />
              {errors.name && <p className="text-[10px] text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                WhatsApp / Celular
              </label>
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          {/* Campos de Endereço (somente no delivery) */}
          {deliveryType === 'delivery' ? (
            <div className="space-y-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 flex items-center gap-1">
                  <MapPin size={14} className="text-red-600" /> Endereço de Entrega
                </span>
                <button
                  type="button"
                  onClick={handleCaptureLocation}
                  disabled={isLocating}
                  className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-1 rounded-lg border border-red-200 flex items-center gap-1 hover:bg-red-100"
                >
                  <Navigation size={10} />
                  <span>{isLocating ? 'Obtendo GPS...' : 'Usar GPS Atual'}</span>
                </button>
              </div>

              {gpsUrl && (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] flex items-center justify-between">
                  <span>GPS capturado com sucesso!</span>
                  <a
                    href={gpsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold"
                  >
                    Ver mapa
                  </a>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Rua / Avenida *"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Nº"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none"
                  />
                </div>
              </div>
              {errors.address && (
                <p className="text-[10px] text-red-600">{errors.address}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Bairro"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Ponto de referência"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-stone-100 rounded-2xl border border-stone-200 text-stone-800 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-xs text-stone-800">
                <Store size={14} className="text-stone-700" /> Retirada no Balcão:
              </span>
              <p className="text-[11px] leading-relaxed text-stone-700">
                Endereço: <strong>{storeInfo.address || 'Rua Advogado Arão Rebelo, 1136 - Navegantes - SC'}</strong>
              </p>
              <p className="text-[10px] text-stone-500">
                Seu pedido será preparado com carinho para você retirar quentinho na lanchonete.
              </p>
            </div>
          )}

          {/* Forma de Pagamento */}
          <div className="space-y-2">
            <label className="font-bold text-stone-700 block">
              Forma de Pagamento:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                  paymentMethod === 'pix'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-stone-200 text-stone-600'
                }`}
              >
                Pix
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cartao')}
                className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                  paymentMethod === 'cartao'
                    ? 'border-red-600 bg-red-50 text-red-800'
                    : 'border-stone-200 text-stone-600'
                }`}
              >
                Cartão
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('dinheiro')}
                className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                  paymentMethod === 'dinheiro'
                    ? 'border-amber-600 bg-amber-50 text-amber-800'
                    : 'border-stone-200 text-stone-600'
                }`}
              >
                Dinheiro
              </button>
            </div>

            {/* Painel do Pix com Opções: Anexar Comprovante ou Manda no WhatsApp */}
            {paymentMethod === 'pix' && (
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                {/* Cabeçalho da Chave Pix */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Chave Pix (CNPJ)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Beneficiário: Mega Lanche Galvão
                  </span>
                </div>

                {/* Chave Pix e Botão Copiar */}
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-stone-200">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-stone-500 block">Chave CNPJ:</span>
                    <span className="font-mono font-bold text-xs text-stone-900 block truncate">
                      {storeInfo.pixKey || '69.984.608/0001-02'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPixKey}
                    className="bg-stone-900 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {pixCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{pixCopied ? 'Copiado!' : 'Copiar Chave'}</span>
                  </button>
                </div>

                {/* Opções de envio do comprovante */}
                <div className="space-y-2 pt-1">
                  <label className="font-bold text-stone-700 text-[11px] block">
                    Como deseja enviar o comprovante?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPixMode('upload')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        pixMode === 'upload'
                          ? 'border-red-600 bg-red-50/60 text-red-950 font-bold shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Upload size={13} className={pixMode === 'upload' ? 'text-red-600' : 'text-stone-400'} />
                        <span className="text-[11px]">Pagar Já & Anexar</span>
                      </div>
                      <span className="text-[9px] text-stone-500 font-normal block leading-tight">
                        PDF ou Print da tela
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPixMode('whatsapp')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        pixMode === 'whatsapp'
                          ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 font-bold shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <MessageCircle size={13} className={pixMode === 'whatsapp' ? 'text-emerald-600' : 'text-stone-400'} />
                        <span className="text-[11px]">Pagar no WhatsApp</span>
                      </div>
                      <span className="text-[9px] text-stone-500 font-normal block leading-tight">
                        Mandar direto na conversa
                      </span>
                    </button>
                  </div>
                </div>

                {/* Upload do Arquivo quando pixMode === 'upload' */}
                {pixMode === 'upload' ? (
                  <div className="space-y-1.5 pt-1">
                    {receiptFile ? (
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-300 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {receiptPreview ? (
                            <img
                              src={receiptPreview}
                              alt="Comprovante"
                              className="w-10 h-10 object-cover rounded-lg border border-stone-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                              <FileText size={20} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-stone-900 block truncate">
                              {receiptFile.name}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              Pronto para envio • {Math.round(receiptFile.size / 1024)} KB
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptFile(null);
                            setReceiptPreview(null);
                          }}
                          className="text-stone-400 hover:text-red-600 p-1"
                          title="Remover arquivo"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="border border-dashed border-stone-300 hover:border-stone-400 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-white transition-colors text-center">
                        <Upload size={18} className="text-stone-400 mb-1" />
                        <span className="text-xs font-bold text-stone-800">
                          Toque aqui para anexar o comprovante
                        </span>
                        <span className="text-[10px] text-stone-400 mt-0.5">
                          Aceita PDF, Print de tela, JPG ou PNG
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleReceiptChange}
                          className="hidden"
                        />
                      </label>
                    )}
                    <span className="text-[10px] text-stone-500 block leading-tight">
                      O comprovante será enviado via link para a lanchonete abrir com um clique no WhatsApp.
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
                    Você pode copiar a chave Pix acima, fazer o pagamento no seu banco e mandar a foto do comprovante direto na conversa do WhatsApp quando abrir o pedido!
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'dinheiro' && (
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Precisa de troco para quanto? (Ex: 50)"
                  value={changeFor}
                  onChange={(e) => setChangeFor(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800"
                />
              </div>
            )}
          </div>

          {/* Observações Gerais */}
          <div>
            <label className="font-bold text-stone-700 block mb-1">
              Observações Gerais (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Tocar a campainha, molho extra, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none"
            />
          </div>

          {/* Resumo do Valor */}
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-stone-500 block text-[11px]">Total do Pedido</span>
              <span className="font-black text-xl text-stone-900 font-display">
                {formatBRL(total)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSendWhatsAppOrder}
              disabled={isUploadingReceipt}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-full text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-70"
            >
              {isUploadingReceipt ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Gerando link...</span>
                </>
              ) : (
                <>
                  <MessageCircle size={16} />
                  <span>Enviar pelo WhatsApp</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE: MODAL DE CUPONS
// ==========================================
function CouponsModal({
  coupons,
  onApply,
  onClose,
}: {
  coupons: Coupon[];
  onApply: (code: string) => void;
  onClose: () => void;
}) {
  const activeCoupons = coupons.filter((c) => c.isActive);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 modal-enter">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 text-red-600 font-bold font-display text-base">
            <Gift size={20} />
            <span>Cupons e Promoções</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-500 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto">
          {activeCoupons.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-4">
              Nenhum cupom ativo no momento.
            </p>
          ) : (
            activeCoupons.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50 flex items-center justify-between gap-2"
              >
                <div>
                  <span className="font-black text-xs text-red-700 font-mono tracking-wider block">
                    {c.code}
                  </span>
                  <span className="text-[11px] text-stone-600 block mt-0.5">
                    {c.description}
                  </span>
                  {c.minOrderValue && (
                    <span className="text-[9px] text-stone-500 block">
                      Válido acima de {formatBRL(c.minOrderValue)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onApply(c.code)}
                  className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0 shadow-xs"
                >
                  Usar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE: MENU LATERAL (DRAWER)
// ==========================================
function SideMenuDrawer({
  storeInfo,
  onClose,
  onOpenAdmin,
  onOpenCoupons,
}: {
  storeInfo: any;
  onClose: () => void;
  onOpenAdmin: () => void;
  onOpenCoupons: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-start">
      <div className="w-full max-w-xs bg-white h-full shadow-2xl p-6 flex flex-col justify-between cart-enter">
        <div className="space-y-6">

          {/* Header do Menu */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-stone-200 bg-white p-1">
                <img
                  src={storeInfo.logoImage || '/images/mega/logo-oficial.jpg'}
                  alt="Mega Lanche Galvão"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 font-display">
                  Mega Lanche Galvão
                </h4>
                <span className="text-[11px] text-amber-600 font-semibold block">
                  {storeInfo.tagline}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-500 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          {/* Links e Atalhos */}
          <div className="space-y-1.5 text-xs font-semibold text-stone-700">
            <a
              href={`https://wa.me/${storeInfo.whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 text-emerald-700"
            >
              <MessageCircle size={16} />
              <span>WhatsApp Disk Delivery</span>
            </a>

            <button
              onClick={onOpenCoupons}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 text-stone-800 text-left"
            >
              <Gift size={16} className="text-red-600" />
              <span>Cupons de Desconto</span>
            </button>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-[11px] text-stone-600">
              <div className="flex items-center gap-2 font-bold text-stone-800">
                <Clock size={13} className="text-amber-500" />
                <span>Horário de Funcionamento:</span>
              </div>
              <p>{storeInfo.openingHours || 'Segunda a Domingo: 18h00 às 23h30'}</p>
              <div className="flex items-center gap-2 font-bold text-stone-800 pt-1">
                <Store size={13} className="text-red-600" />
                <span>Retirada no Balcão:</span>
              </div>
              <p>{storeInfo.address || 'Rua Advogado Arão Rebelo, 1136 - Navegantes - SC'}</p>
            </div>
          </div>
        </div>

        {/* Rodapé com Botão Admin */}
        <div className="pt-4 border-t border-stone-100 space-y-2">
          <button
            onClick={onOpenAdmin}
            className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Lock size={13} />
            <span>Painel Administrativo</span>
          </button>
          <span className="text-[10px] text-stone-400 text-center block">
            Mega Lanche Galvão • v3.0
          </span>
        </div>
      </div>
    </div>
  );
}
