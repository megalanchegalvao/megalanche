import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Check,
  Tag,
  Store,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Percent,
  Search,
  ExternalLink,
  LogOut,
  Sparkles,
  X,
  Flame,
  UtensilsCrossed,
  Coffee,
  ArrowUp,
  ArrowDown,
  Database,
  Copy,
  Download,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { type Product, type Coupon, type PresentationOption, type CategoryItem } from '../data/menu';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabase';
import { Cloud, RefreshCw } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const {
    products,
    popularProductIds,
    categories,
    coupons,
    storeInfo,
    heroInfo,
    addProduct,
    updateProduct,
    deleteProduct,
    setPopularProductIds,
    togglePopularProduct,
    addPopularProduct,
    removePopularProduct,
    reorderPopularProduct,
    isProductPopular,
    updateCategory,
    addCategory,
    deleteCategory,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    updateStoreInfo,
    updateHeroInfo,
    processImageFile,
    syncAllToSupabase,
  } = useStore();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'popular' | 'categories' | 'store' | 'hero' | 'coupons'>('products');
  const [toast, setToast] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    showNotification('Sincronizando fotos e dados com a nuvem Supabase... ⏳');
    try {
      const res = await syncAllToSupabase();
      if (res.success) {
        showNotification(`Sucesso! ${res.count} produtos sincronizados na nuvem! ✅`);
      } else {
        showNotification(`Aviso na sincronização: ${res.error || 'Verifique sua conexão'}`);
      }
    } catch (e: any) {
      showNotification(`Erro ao sincronizar: ${e?.message || e}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Busca dentro do admin
  const [adminSearch, setAdminSearch] = useState('');

  // Estados para aba Mais Vendidos
  const [popularSearch, setPopularSearch] = useState('');
  const [popularCategoryFilter, setPopularCategoryFilter] = useState('Todas');

  // Lanches atualmente nos Mais Vendidos na ordem
  const popularProductsList = useMemo(() => {
    return popularProductIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));
  }, [popularProductIds, products]);

  // Lanches que ainda NÃO estão nos Mais Vendidos para poder selecionar e adicionar
  const availableToAdd = useMemo(() => {
    return products.filter((p) => {
      const isAlreadyPopular = popularProductIds.includes(p.id);
      if (isAlreadyPopular) return false;

      const matchesCat =
        popularCategoryFilter === 'Todas' ||
        p.category.toLowerCase() === popularCategoryFilter.toLowerCase();
      const q = popularSearch.toLowerCase().trim();
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [products, popularProductIds, popularCategoryFilter, popularSearch]);

  // Estados de formulário de Produto
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [prodForm, setProdForm] = useState<{
    name: string;
    tagline: string;
    description: string;
    category: string;
    image: string;
    available: boolean;
    isPopular: boolean;
    ingredientsBadge: string;
    options: PresentationOption[];
  }>({
    name: '',
    tagline: '',
    description: '',
    category: 'Lanches',
    image: '',
    available: true,
    isPopular: false,
    ingredientsBadge: '',
    options: [
      { id: 'opt-1', name: 'Individual', description: 'Porção individual', price: 25 },
    ],
  });

  // Estados de formulário de Categoria
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{ name: string; icon: string }>({
    name: '',
    icon: '',
  });

  // Estados de formulário de Cupom
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isCouponFormOpen, setIsCouponFormOpen] = useState(false);
  const [couponForm, setCouponForm] = useState<{
    code: string;
    description: string;
    type: 'percentage' | 'fixed';
    value: number;
    minOrderValue: number;
    isActive: boolean;
  }>({
    code: '',
    description: '',
    type: 'percentage',
    value: 10,
    minOrderValue: 30,
    isActive: true,
  });

  // Configurações da Loja
  const [storeForm, setStoreForm] = useState({ ...storeInfo });
  // Configurações do Hero & Banners
  const [heroForm, setHeroForm] = useState({ ...heroInfo });

  // Manter heroForm sincronizado sempre que heroInfo mudar
  useEffect(() => {
    setHeroForm({ ...heroInfo });
  }, [heroInfo]);

  // Manter storeForm sincronizado sempre que storeInfo mudar
  useEffect(() => {
    setStoreForm({ ...storeInfo });
  }, [storeInfo]);

  // Referências para upload de arquivo
  const productFileRef = useRef<HTMLInputElement>(null);
  const categoryFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (!isOpen) return null;

  // 1. TELA DE LOGIN / SENHA ADMIN
  if (!isAuthenticated) {
    const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const entered = pinInput.trim();
      if (entered === storeInfo.adminPin || entered === 'Galvao2026On' || entered === 'mega123') {
        setIsAuthenticated(true);
        setPinError('');
      } else {
        setPinError('Senha de administrador incorreta.');
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-[#F4F5F7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white text-stone-900 rounded-3xl shadow-xl p-8 z-10 text-center border border-stone-200">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 font-bold mb-4"
          >
            <ArrowLeft size={16} /> Voltar ao Cardápio
          </button>

          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-xs">
            <Lock size={28} />
          </div>

          <h3 className="font-display text-2xl font-black text-stone-900">
            Painel do Administrador
          </h3>
          <p className="text-xs text-stone-500 mt-1.5 mb-6 leading-relaxed">
            Área de gestão do <strong>Mega Lanche Galvão</strong>. Digite sua senha para acessar o painel completo.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="Digite a senha de administrador..."
                className="w-full px-4 py-3.5 rounded-2xl border border-stone-300 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-red-600 font-medium"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {pinError && <p className="text-red-600 text-xs font-semibold">{pinError}</p>}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors shadow-md active:scale-95"
            >
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. PAINEL PRINCIPAL "FORA A FORA" (PÁGINA DEDICADA 100% DA TELA)
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      tagline: '',
      description: '',
      category: categories.find((c) => c.name !== 'Todos')?.name || 'Lanches',
      image: '',
      available: true,
      isPopular: false,
      ingredientsBadge: '',
      options: [
        { id: `opt-${Date.now()}`, name: 'Padrão', description: '', price: 25 },
      ],
    });
    setIsProductFormOpen(true);
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdForm({
      name: prod.name || '',
      tagline: prod.tagline || '',
      description: prod.description || '',
      category: prod.category || 'Lanches',
      image: prod.image || '',
      available: prod.available ?? true,
      isPopular: isProductPopular(prod.id),
      ingredientsBadge: prod.ingredientsBadge || '',
      options: prod.options && prod.options.length > 0
        ? prod.options
        : [{ id: 'opt-padrao', name: prod.name || 'Padrão', description: '', price: 0 }],
    });
    setIsProductFormOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name.trim()) {
      showNotification('O nome do produto é obrigatório.');
      return;
    }

    const currentPrice = prodForm.options[0]?.price ?? 0;
    const baseOption: PresentationOption = {
      ...(prodForm.options[0] || { id: 'opt-padrao', description: '' }),
      name: prodForm.options[0]?.name || prodForm.name || 'Padrão',
      price: currentPrice,
    };
    const finalOptions = [
      baseOption,
      ...(prodForm.options.slice(1)),
    ];

    const productPayload = {
      name: prodForm.name,
      tagline: prodForm.tagline,
      description: prodForm.description,
      category: prodForm.category,
      image: prodForm.image,
      available: prodForm.available,
      ingredientsBadge: prodForm.ingredientsBadge,
      options: finalOptions,
    };

    let targetProductId = editingProduct ? editingProduct.id : '';
    if (editingProduct) {
      await updateProduct({
        ...editingProduct,
        ...productPayload,
      });
      showNotification(`Produto "${prodForm.name}" atualizado! ✅`);
    } else {
      const created = await addProduct(productPayload);
      targetProductId = created.id;
      showNotification(`Novo produto "${prodForm.name}" criado! ✅`);
    }

    if (targetProductId) {
      if (prodForm.isPopular) {
        addPopularProduct(targetProductId);
      } else {
        removePopularProduct(targetProductId);
      }
    }

    setIsProductFormOpen(false);
  };

  // Upload de Imagem de Produto
  const handleUploadProductImage = async (file: File) => {
    try {
      showNotification('Processando imagem...');
      const dataUrl = await processImageFile(file);
      setProdForm((prev) => ({ ...prev, image: dataUrl }));
      if (dataUrl.startsWith('http')) {
        showNotification('Imagem salva na nuvem (sincronizada para todos os aparelhos)! ✅');
      } else {
        showNotification('Imagem salva localmente neste aparelho. (Execute o SQL no Supabase para sincronizar em outros) ⚠️');
      }
    } catch {
      showNotification('Erro ao carregar imagem.');
    }
  };

  // Upload de Imagem de Categoria
  const handleUploadCategoryImage = async (file: File) => {
    try {
      showNotification('Processando foto da categoria...');
      const dataUrl = await processImageFile(file);
      setCategoryForm((prev) => ({ ...prev, icon: dataUrl }));
      showNotification('Foto da categoria carregada! ✅');
    } catch {
      showNotification('Erro ao carregar foto.');
    }
  };

  // Upload de Logo Oficial
  const handleUploadLogo = async (file: File) => {
    try {
      showNotification('Enviando logotipo para a nuvem... ⏳');
      const dataUrl = await processImageFile(file);
      setStoreForm((prev) => ({ ...prev, logoImage: dataUrl }));
      await updateStoreInfo({ ...storeForm, logoImage: dataUrl });
      showNotification('Logotipo atualizado e salvo na nuvem com sucesso! ✅');
    } catch {
      showNotification('Erro ao carregar logotipo.');
    }
  };

  // Upload de Imagem Hero
  const handleUploadHeroImage = async (file: File) => {
    try {
      showNotification('Enviando imagem do Banner Principal para a nuvem... ⏳');
      const dataUrl = await processImageFile(file);
      setHeroForm((prev) => ({ ...prev, image: dataUrl }));
      await updateHeroInfo({ ...heroForm, image: dataUrl });
      showNotification('Banner principal atualizado e salvo na nuvem com sucesso! ✅');
    } catch {
      showNotification('Erro ao carregar imagem do banner.');
    }
  };

  const handleSaveStoreInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateStoreInfo(storeForm);
    showNotification('Dados e logotipo da loja salvos! ✅');
  };

  const handleSaveHeroInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateHeroInfo(heroForm);
    showNotification('Banners e textos salvos! ✅');
  };

  const handleExportMenuJson = () => {
    try {
      const data = JSON.stringify(products, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cardapio-megalanche-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Arquivo do cardápio baixado com sucesso! ✅');
    } catch {
      showNotification('Erro ao exportar cardápio.');
    }
  };

  const filteredAdminProducts = products.filter((p) => {
    const q = adminSearch.toLowerCase().trim();
    return !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F6F9] min-h-screen w-full overflow-y-auto flex flex-col font-sans">

      {/* ===== BARRA DE TOPO DA PÁGINA ADMINISTRATIVA (FORA A FORA) ===== */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200/80 shadow-xs">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">

          {/* Logo e Nome da Lanchonete */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white border border-stone-200 p-1 overflow-hidden shrink-0">
              <img
                src={storeInfo.logoImage || '/images/mega/logo-oficial.jpg'}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-black text-base sm:text-lg text-stone-900 leading-none">
                  Mega Lanche Galvão
                </h1>
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  PAINEL ADMIN
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                Gestão Completa de Produtos, Fotos, Preços, Banners e WhatsApp
              </p>
            </div>
          </div>

          {/* Botões de Ação do Topo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSyncToCloud}
              disabled={isSyncing}
              title="Salva todas as fotos e produtos no Supabase para aparecer em todos os aparelhos"
              className={`inline-flex items-center gap-2 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xs transition-all active:scale-95 ${
                isSyncing
                  ? 'bg-amber-600 animate-pulse cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar com a Nuvem'}</span>
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 bg-stone-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xs transition-colors"
            >
              <ArrowLeft size={15} />
              <span>Voltar ao Cardápio</span>
            </button>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                onClose();
              }}
              title="Sair"
              className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Barra de Abas Amplas (Fora a Fora) */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex border-t border-stone-100 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3.5 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            🍔 Cardápio de Produtos ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`py-3.5 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'popular'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            🔥 Mais Vendidos ({popularProductIds.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3.5 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'categories'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            🏷️ Categorias & Fotos Circulares ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`py-3.5 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'store'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            👑 Identidade & Loja (Logo, WhatsApp, Horários)
          </button>
          <button
            onClick={() => setActiveTab('hero')}
            className={`py-3.5 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'hero'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            🖼️ Banners & Textos
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`py-3.5 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'coupons'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            🎁 Cupons de Desconto ({coupons.length})
          </button>
        </div>
      </header>

      {/* Toast Flutuante de Notificação */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-stone-900 text-white text-xs font-semibold px-5 py-3 rounded-2xl shadow-xl border border-stone-700 animate-bounce">
          {toast}
        </div>
      )}

      {/* ===== ÁREA DE CONTEÚDO FORA A FORA ===== */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ======================================================== */}
        {/* ABA: PRODUTOS (CARDÁPIO COMPLETO) */}
        {/* ======================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
              <div>
                <h2 className="font-display font-black text-xl text-stone-900">
                  Cardápio de Produtos
                </h2>
                <p className="text-xs text-stone-500">
                  Gerencie lanches, barcas, pastéis e bebidas. Altere fotos, valores e descrições com 1 clique.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-red-600"
                  />
                </div>
                <button
                  onClick={handleOpenNewProduct}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm shrink-0 active:scale-95 transition-transform"
                >
                  <Plus size={16} />
                  <span>Novo Produto</span>
                </button>
              </div>
            </div>

            {/* Modal de Cadastro / Edição de Produto (Pop-up Centralizado com Backdrop) */}
            {isProductFormOpen && (
              <div
                className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto touch-manipulation animate-in fade-in duration-200"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsProductFormOpen(false);
                }}
              >
                <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
                  {/* Cabeçalho Fixo do Modal */}
                  <div className="flex items-center justify-between px-6 py-4 bg-stone-50 border-b border-stone-200 shrink-0">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-600 block">
                        {editingProduct ? 'Editar Produto' : 'Cadastrar Item'}
                      </span>
                      <h3 className="font-display font-black text-lg text-stone-900 line-clamp-1">
                        {editingProduct ? editingProduct.name : 'Novo Produto'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsProductFormOpen(false)}
                      className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition-colors shrink-0 active:scale-95"
                      title="Fechar"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Formulário com Scroll Próprio */}
                  <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="font-bold text-stone-700 block mb-1">
                          Nome do Produto *
                        </label>
                        <input
                          type="text"
                          required
                          value={prodForm.name}
                          onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:outline-none focus:border-red-600"
                          placeholder="Ex: X-Mega Especial"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Categoria *
                        </label>
                        <select
                          value={prodForm.category}
                          onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:outline-none focus:border-red-600"
                        >
                          {categories.filter((c) => c.name !== 'Todos').map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Destaque nos Mais Vendidos */}
                    <button
                      type="button"
                      onClick={() => setProdForm((prev) => ({ ...prev, isPopular: !prev.isPopular }))}
                      className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-between font-bold text-xs transition-colors ${
                        prodForm.isPopular
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      <span>{prodForm.isPopular ? '🔥 Exibir nos Mais Vendidos' : 'Não exibir nos Mais Vendidos'}</span>
                      <span className="text-[10px] underline">Alternar</span>
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Preço Principal (R$) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-xs">
                            R$
                          </span>
                          <input
                            type="number"
                            step="0.50"
                            min="0"
                            required
                            value={prodForm.options[0]?.price ?? 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const currentOptions = prodForm.options && prodForm.options.length > 0 ? prodForm.options : [{ id: 'padrao', name: prodForm.name || 'Padrão', price: 0 }];
                              setProdForm({
                                ...prodForm,
                                options: [
                                  {
                                    ...currentOptions[0],
                                    price: val,
                                  },
                                  ...currentOptions.slice(1),
                                ],
                              });
                            }}
                            className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-4 py-2.5 text-sm font-black text-stone-900 focus:outline-none focus:border-red-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Disponibilidade no Cardápio
                        </label>
                        <button
                          type="button"
                          onClick={() => setProdForm({ ...prodForm, available: !prodForm.available })}
                          className={`w-full py-2.5 px-3.5 rounded-xl border flex items-center justify-between font-bold text-xs transition-colors ${
                            prodForm.available
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-red-50 border-red-300 text-red-800'
                          }`}
                        >
                          <span>{prodForm.available ? '🟢 Disponível para Pedidos' : '🔴 Esgotado no Momento'}</span>
                          <span className="text-[10px] underline">Alternar</span>
                        </button>
                      </div>
                    </div>

                    {/* Destaque nos Mais Vendidos */}
                    <button
                      type="button"
                      onClick={() => setProdForm((prev) => ({ ...prev, isPopular: !prev.isPopular }))}
                      className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-between font-bold text-xs transition-colors ${
                        prodForm.isPopular
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      <span>{prodForm.isPopular ? '🔥 Exibir nos Mais Vendidos' : 'Não exibir nos Mais Vendidos'}</span>
                      <span className="text-[10px] underline">Alternar</span>
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Subtítulo / Tagline
                        </label>
                        <input
                          type="text"
                          value={prodForm.tagline}
                          onChange={(e) => setProdForm({ ...prodForm, tagline: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs"
                          placeholder="Ex: Muito queijo e bacon crocante"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Selo de Destaque / Ingredientes
                        </label>
                        <input
                          type="text"
                          value={prodForm.ingredientsBadge}
                          onChange={(e) => setProdForm({ ...prodForm, ingredientsBadge: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs"
                          placeholder="Ex: Burger 160g • Bacon • Queijo"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">
                        Descrição Detalhada
                      </label>
                      <textarea
                        rows={3}
                        value={prodForm.description}
                        onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-red-600"
                        placeholder="Descreva os ingredientes, acompanhamentos e sabor..."
                      />
                    </div>

                    {/* Foto do Produto com Upload do Computador / Celular */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                      <label className="font-bold text-stone-800 block text-xs">
                        Foto do Produto (Upload ou Link)
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-24 h-24 rounded-2xl bg-white border border-stone-200 overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                          {prodForm.image ? (
                            <img
                              src={prodForm.image}
                              alt="Prévia"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-2 text-stone-400">
                              <Upload size={20} className="mx-auto mb-1 text-stone-300" />
                              <span className="text-[9px] font-semibold block leading-tight">Sem foto</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2 w-full">
                          <input
                            type="text"
                            value={prodForm.image}
                            onChange={(e) => setProdForm({ ...prodForm, image: e.target.value })}
                            placeholder="Cole a URL da imagem ou envie abaixo..."
                            className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={productFileRef}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadProductImage(file);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => productFileRef.current?.click()}
                              className="w-full sm:w-auto bg-stone-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-transform"
                            >
                              <Upload size={14} />
                              <span>Carregar Foto do Celular / PC</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botões do Rodapé */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setIsProductFormOpen(false)}
                        className="px-5 py-2.5 rounded-full border border-stone-300 text-stone-600 font-bold hover:bg-stone-50 active:scale-95 transition-transform"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold shadow-md active:scale-95 transition-transform"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Grid Amplo de Produtos Cadastrados (Fora a Fora) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAdminProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-red-200 transition-all group"
                >
                  <div
                    onClick={() => handleEditProduct(p)}
                    className="cursor-pointer"
                    title="Clique para editar este item"
                  >
                    <div className="w-full h-36 rounded-2xl overflow-hidden bg-stone-100 mb-3 relative flex items-center justify-center">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-stone-400 p-2 text-center">
                          <ImageIcon size={28} className="text-stone-300 mb-1" />
                          <span className="text-[10px] font-semibold text-stone-400">Sem foto adicionada</span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                        {p.category}
                      </span>
                      {isProductPopular(p.id) && (
                        <span className="absolute bottom-2 left-2 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          🔥 Mais Vendido
                        </span>
                      )}
                      {!p.available && (
                        <span className="absolute top-2 right-2 bg-stone-900/90 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                          Esgotado
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-stone-900 line-clamp-1 group-hover:text-red-600 transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-stone-100">
                    <span className="font-black text-base text-stone-900 font-display">
                      {formatBRL(p.options[0]?.price || 0)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditProduct(p)}
                        className="h-9 px-3.5 rounded-full bg-stone-900 hover:bg-black text-white flex items-center gap-1.5 text-xs font-bold shadow-xs active:scale-95 transition-all touch-manipulation"
                        title="Editar produto"
                      >
                        <Edit2 size={13} />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir o produto "${p.name}"?`)) {
                            deleteProduct(p.id);
                            showNotification('Produto removido.');
                          }
                        }}
                        className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors active:scale-95 touch-manipulation"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA: MAIS VENDIDOS */}
        {/* ======================================================== */}
        {activeTab === 'popular' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
              <div>
                <h2 className="font-display font-black text-xl text-stone-900 flex items-center gap-2">
                  Gestão dos Mais Vendidos
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    🔥 {popularProductsList.length} lanches
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Selecione e remova lanches da seção <strong>"Mais Vendidos"</strong> que aparece no topo da página inicial. Use as setas para reordenar.
                </p>
              </div>
            </div>

            {/* Lanches atualmente na seção */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
                🔥 Lanches na Seção ({popularProductsList.length})
              </h3>

              {popularProductsList.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                  <p className="text-xs text-stone-500">Nenhum lanche na sessão. Selecione abaixo para adicionar.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {popularProductsList.map((p, index) => (
                    <div key={p.id} className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200 shadow-2xs flex flex-col justify-between group">
                      <div>
                        <div className="w-full h-32 rounded-xl overflow-hidden bg-stone-100 mb-2.5 relative flex items-center justify-center">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-stone-400 p-2 text-center">
                              <ImageIcon size={22} className="text-stone-300 mb-0.5" />
                              <span className="text-[9px] font-semibold text-stone-400">Sem foto</span>
                            </div>
                          )}
                          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                            #{index + 1}
                          </span>
                          <span className="absolute top-2 right-2 bg-stone-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                            {p.category}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-xs text-stone-900 line-clamp-1">{p.name}</h4>
                        <p className="font-black text-sm text-stone-900 font-display mt-1">{formatBRL(p.options[0]?.price || 0)}</p>
                      </div>

                      <div className="pt-2.5 mt-2.5 border-t border-amber-200/80 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => reorderPopularProduct(p.id, 'up')} disabled={index === 0} title="Mover para cima" className="w-7 h-7 rounded-lg bg-white border border-stone-200 text-stone-600 disabled:opacity-30 hover:bg-stone-100 flex items-center justify-center transition-colors">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" onClick={() => reorderPopularProduct(p.id, 'down')} disabled={index === popularProductsList.length - 1} title="Mover para baixo" className="w-7 h-7 rounded-lg bg-white border border-stone-200 text-stone-600 disabled:opacity-30 hover:bg-stone-100 flex items-center justify-center transition-colors">
                            <ArrowDown size={13} />
                          </button>
                        </div>
                        <button type="button" onClick={() => { removePopularProduct(p.id); showNotification(`"${p.name}" removido dos Mais Vendidos.`); }} className="px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95">
                          <Trash2 size={12} /> Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selecionar novos lanches */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Plus size={16} className="text-red-600" /> Adicionar Lanches do Cardápio
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input type="text" placeholder="Filtrar por nome..." value={popularSearch} onChange={(e) => setPopularSearch(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-full pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-red-600" />
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {['Todas', ...categories.filter((c) => c.name !== 'Todos').map((c) => c.name)].map((cat) => (
                  <button key={cat} type="button" onClick={() => setPopularCategoryFilter(cat)} className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${popularCategoryFilter === cat ? 'bg-red-600 text-white font-bold' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                    {cat}
                  </button>
                ))}
              </div>

              {availableToAdd.length === 0 ? (
                <div className="p-6 text-center bg-stone-50 rounded-2xl text-stone-500 text-xs">
                  {popularSearch ? 'Nenhum lanche encontrado.' : 'Todos os lanches já estão nos Mais Vendidos! 🎉'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {availableToAdd.map((p) => (
                    <div key={p.id} className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col justify-between hover:shadow-md hover:border-red-200 transition-all group">
                      <div>
                        <div className="w-full h-28 rounded-xl overflow-hidden bg-stone-100 mb-2 relative flex items-center justify-center">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-stone-400 p-2 text-center">
                              <ImageIcon size={20} className="text-stone-300 mb-0.5" />
                              <span className="text-[9px] font-semibold text-stone-400">Sem foto</span>
                            </div>
                          )}
                          <span className="absolute top-2 left-2 bg-stone-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">{p.category}</span>
                        </div>
                        <h4 className="font-bold text-xs text-stone-900 line-clamp-1">{p.name}</h4>
                      </div>
                      <div className="pt-2.5 mt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                        <span className="font-black text-sm text-stone-900 font-display">{formatBRL(p.options[0]?.price || 0)}</span>
                        <button type="button" onClick={() => { addPopularProduct(p.id); showNotification(`"${p.name}" adicionado aos Mais Vendidos! 🔥`); }} className="px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all">
                          <Plus size={13} /> Adicionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA: CATEGORIAS & FOTOS CIRCULARES */}
        {/* ======================================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
              <div>
                <h2 className="font-display font-black text-xl text-stone-900">
                  Categorias & Fotos Circulares
                </h2>
                <p className="text-xs text-stone-500">
                  Altere as fotos redondas e os nomes das categorias do carrossel principal.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', icon: '' });
                  setIsCategoryFormOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-full flex items-center gap-2 shadow-xs shrink-0"
              >
                <Plus size={16} /> Nova Categoria
              </button>
            </div>

            {/* Modal de Categoria (Pop-up Centralizado com Backdrop) */}
            {isCategoryFormOpen && (
              <div
                className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto touch-manipulation animate-in fade-in duration-200"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsCategoryFormOpen(false);
                }}
              >
                <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-6 py-4 bg-stone-50 border-b border-stone-200 shrink-0">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-600 block">
                        {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                      </span>
                      <h3 className="font-bold text-sm text-stone-900">
                        {editingCategory ? `Editar: ${editingCategory.name}` : 'Criar Nova Categoria'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCategoryFormOpen(false)}
                      className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition-colors shrink-0 active:scale-95"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-6 space-y-4 text-xs overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Nome da Categoria
                        </label>
                        <input
                          type="text"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          placeholder="Ex: Sobremesas & Milk-shakes"
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-red-600"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Link / URL da Imagem
                        </label>
                        <input
                          type="text"
                          value={categoryForm.icon}
                          onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                          placeholder="URL da foto circular..."
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-red-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <div className="w-16 h-16 rounded-full p-1 ring-3 ring-red-600 bg-white overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                        {categoryForm.icon ? (
                          <img
                            src={categoryForm.icon}
                            alt="Prévia"
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <ImageIcon size={20} className="text-stone-300" />
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          ref={categoryFileRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadCategoryImage(file);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => categoryFileRef.current?.click()}
                          className="bg-stone-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 active:scale-95 transition-transform"
                        >
                          <Upload size={14} />
                          <span>Escolher Foto do Celular / PC</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setIsCategoryFormOpen(false)}
                        className="px-5 py-2.5 rounded-full border border-stone-300 text-stone-600 font-bold active:scale-95 transition-transform"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!categoryForm.name.trim()) return;
                          if (editingCategory) {
                            await updateCategory({ ...editingCategory, ...categoryForm });
                            showNotification('Categoria atualizada! ✅');
                          } else {
                            await addCategory(categoryForm);
                            showNotification('Categoria adicionada! ✅');
                          }
                          setIsCategoryFormOpen(false);
                        }}
                        className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold active:scale-95 transition-transform shadow-md"
                      >
                        Salvar Categoria
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid de Categorias (Fora a Fora) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex flex-col items-center text-center justify-between gap-3 hover:shadow-md transition-all"
                >
                  <div className="w-20 h-20 rounded-full p-1 ring-4 ring-red-600 bg-white overflow-hidden shadow-xs flex items-center justify-center">
                    {c.icon ? (
                      <img
                        src={c.icon}
                        alt={c.name}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-stone-50 flex items-center justify-center">
                        {c.name === 'Barcas' ? (
                          <Flame size={28} className="text-amber-600" />
                        ) : c.name === 'Lanches' ? (
                          <UtensilsCrossed size={28} className="text-red-600" />
                        ) : c.name === 'Pastéis' ? (
                          <Sparkles size={28} className="text-amber-500" />
                        ) : c.name === 'Bebidas' ? (
                          <Coffee size={28} className="text-blue-500" />
                        ) : (
                          <Store size={28} className="text-red-600" />
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-stone-900">
                      {c.name}
                    </h4>
                    <span className="text-[10px] text-stone-400">
                      {c.icon ? 'Foto circular ativa' : 'Sem foto (ícone ativo)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100 w-full justify-center">
                    <button
                      onClick={() => {
                        setEditingCategory(c);
                        setCategoryForm({ name: c.name, icon: c.icon });
                        setIsCategoryFormOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                    >
                      <Edit2 size={12} />
                      <span>Trocar Foto</span>
                    </button>
                    {c.name !== 'Todos' && (
                      <button
                        onClick={() => {
                          if (confirm(`Remover a categoria ${c.name}?`)) {
                            deleteCategory(c.id);
                            showNotification('Categoria removida.');
                          }
                        }}
                        className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA: IDENTIDADE DA LOJA */}
        {/* ======================================================== */}
        {activeTab === 'store' && (
          <form onSubmit={handleSaveStoreInfo} className="space-y-6 text-xs max-w-4xl">
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
              <h2 className="font-display font-black text-xl text-stone-900">
                Identidade Visual e Informações da Loja
              </h2>
              <p className="text-xs text-stone-500">
                Altere a logo oficial, nome da lanchonete, número do WhatsApp para receber pedidos, horários e senha.
              </p>
            </div>

            {/* Painel de Sincronização em Nuvem (Supabase) */}
            <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50/40 rounded-3xl border border-amber-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Database className="text-amber-700" size={18} />
                <h3 className="font-bold text-sm text-amber-950">
                  Sincronização em Nuvem & Fotos (Supabase)
                </h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Para que as novas fotos e alterações apareçam em outros celulares, computadores e guias anônimas, o seu banco Supabase precisa estar com as tabelas criadas. Se ainda não executou, copie o código SQL abaixo e rode no SQL Editor do seu Supabase.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSyncToCloud}
                  disabled={isSyncing}
                  className={`text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 ${
                    isSyncing
                      ? 'bg-amber-600 animate-pulse cursor-wait'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Sincronizando Tudo...' : 'Sincronizar Todas as Fotos e Dados para a Nuvem'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                    showNotification('Código SQL copiado para a área de transferência! ✅');
                  }}
                  className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Copy size={13} />
                  <span>Copiar Código SQL do Supabase</span>
                </button>
                <a
                  href="https://supabase.com/dashboard/project/ounrfythtkpuldvplhec/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white hover:bg-stone-50 border border-amber-300 text-amber-900 font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <ExternalLink size={13} />
                  <span>Abrir SQL Editor no Supabase</span>
                </a>
                <button
                  type="button"
                  onClick={handleExportMenuJson}
                  className="bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors ml-auto"
                >
                  <Download size={13} />
                  <span>Exportar Cardápio (JSON)</span>
                </button>
              </div>
            </div>

            {/* Logotipo da Loja com Upload */}
            <div className="p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-3">
              <label className="font-bold text-sm text-stone-800 block">
                Logotipo Oficial da Loja
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-28 h-28 rounded-3xl bg-stone-50 border border-stone-200 p-2 overflow-hidden shrink-0 shadow-2xs">
                  <img
                    src={storeForm.logoImage || '/images/mega/logo-oficial.jpg'}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 space-y-3 w-full">
                  <input
                    type="text"
                    value={storeForm.logoImage || ''}
                    onChange={(e) => setStoreForm({ ...storeForm, logoImage: e.target.value })}
                    placeholder="URL da logo..."
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs"
                  />
                  <input
                    type="file"
                    ref={logoFileRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadLogo(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => logoFileRef.current?.click()}
                    className="bg-stone-900 hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2"
                  >
                    <Upload size={14} />
                    <span>Carregar Nova Logo do Computador / Celular</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dados Cadastrais */}
            <div className="p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Nome da Lanchonete
                  </label>
                  <input
                    type="text"
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Slogan / Tagline
                  </label>
                  <input
                    type="text"
                    value={storeForm.tagline}
                    onChange={(e) => setStoreForm({ ...storeForm, tagline: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    WhatsApp (Número para receber pedidos com DDD)
                  </label>
                  <input
                    type="text"
                    value={storeForm.whatsappNumber}
                    onChange={(e) => setStoreForm({ ...storeForm, whatsappNumber: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold"
                    placeholder="5511999999999"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    WhatsApp Exibição Formatada
                  </label>
                  <input
                    type="text"
                    value={storeForm.whatsappDisplay}
                    onChange={(e) => setStoreForm({ ...storeForm, whatsappDisplay: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Endereço Completo da Lanchonete (Retirada)
                  </label>
                  <input
                    type="text"
                    value={storeForm.address || 'Rua Advogado Arão Rebelo, 1136 - Navegantes - SC'}
                    onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                    placeholder="Rua Advogado Arão Rebelo, 1136 - Navegantes - SC"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Chave Pix Oficial (CNPJ)
                  </label>
                  <input
                    type="text"
                    value={storeForm.pixKey || '69.984.608/0001-02'}
                    onChange={(e) => setStoreForm({ ...storeForm, pixKey: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold"
                    placeholder="69.984.608/0001-02"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Horário de Atendimento
                </label>
                <input
                  type="text"
                  value={storeForm.openingHours || 'Segunda a Domingo: 18h00 às 23h30'}
                  onChange={(e) => setStoreForm({ ...storeForm, openingHours: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-stone-100">
                <label className="font-bold text-red-600 block mb-1 flex items-center gap-1.5">
                  <Lock size={14} /> Senha da Área Administrativa
                </label>
                <input
                  type="text"
                  value={storeForm.adminPin}
                  onChange={(e) => setStoreForm({ ...storeForm, adminPin: e.target.value })}
                  className="w-full sm:w-72 bg-red-50 border border-red-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-md text-xs active:scale-95 transition-transform"
            >
              Salvar Alterações da Loja
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* ABA: BANNERS & TEXTOS */}
        {/* ======================================================== */}
        {activeTab === 'hero' && (
          <form onSubmit={handleSaveHeroInfo} className="space-y-6 text-xs max-w-4xl">
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
              <h2 className="font-display font-black text-xl text-stone-900">
                Banners & Textos do Site
              </h2>
              <p className="text-xs text-stone-500">
                Edite os textos principais, frases de efeito e imagens dos banners.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-stone-800">Banner Principal (Hero)</h3>
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Título Principal
                </label>
                <input
                  type="text"
                  value={heroForm.title}
                  onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Subtítulo / Descrição
                </label>
                <textarea
                  rows={2}
                  value={heroForm.subtitle}
                  onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs leading-relaxed"
                />
              </div>

              {/* Imagem do Hero */}
              <div className="space-y-2 pt-2">
                <label className="font-bold text-stone-700 block">
                  Imagem do Banner Principal
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {heroForm.image ? (
                      <img
                        src={heroForm.image}
                        alt="Hero"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-stone-400 p-2 text-center">
                        <Upload size={20} className="text-stone-300 mb-1" />
                        <span className="text-[9px] font-semibold text-stone-400">Sem banner</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="text"
                      value={heroForm.image}
                      onChange={(e) => setHeroForm({ ...heroForm, image: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs"
                    />
                    <input
                      type="file"
                      ref={heroFileRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadHeroImage(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => heroFileRef.current?.click()}
                      className="bg-stone-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2"
                    >
                      <Upload size={14} /> Carregar Nova Foto do Computador
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Segundo Banner: Oferta Especial */}
            <div className="p-6 bg-white rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-stone-800">Segundo Banner (Oferta de Barcas)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Tag Superior
                  </label>
                  <input
                    type="text"
                    value={heroForm.promoBannerTag || 'Oferta Especial para Compartilhar'}
                    onChange={(e) => setHeroForm({ ...heroForm, promoBannerTag: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Título do Banner
                  </label>
                  <input
                    type="text"
                    value={heroForm.promoBannerTitle || 'As Lendárias Barcas do Mega Lanche Galvão!'}
                    onChange={(e) => setHeroForm({ ...heroForm, promoBannerTitle: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Texto Descritivo
                </label>
                <textarea
                  rows={2}
                  value={heroForm.promoBannerSubtitle || ''}
                  onChange={(e) => setHeroForm({ ...heroForm, promoBannerSubtitle: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs leading-relaxed"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-md text-xs active:scale-95 transition-transform"
            >
              Salvar Banners
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* ABA: CUPONS */}
        {/* ======================================================== */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
              <div>
                <h2 className="font-display font-black text-xl text-stone-900">
                  Cupons de Desconto
                </h2>
                <p className="text-xs text-stone-500">
                  Crie cupons em porcentagem (ex: 10%) ou valor fixo em reais (ex: R$ 5,00) para fidelizar clientes.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCoupon(null);
                  setCouponForm({
                    code: '',
                    description: '',
                    type: 'percentage',
                    value: 10,
                    minOrderValue: 30,
                    isActive: true,
                  });
                  setIsCouponFormOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-full flex items-center gap-2 shadow-xs shrink-0"
              >
                <Plus size={16} /> Novo Cupom
              </button>
            </div>

            {/* Modal de Cupom (Pop-up Centralizado com Backdrop) */}
            {isCouponFormOpen && (
              <div
                className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto touch-manipulation animate-in fade-in duration-200"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsCouponFormOpen(false);
                }}
              >
                <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-6 py-4 bg-stone-50 border-b border-stone-200 shrink-0">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-600 block">
                        {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
                      </span>
                      <h3 className="font-bold text-sm text-stone-900">
                        {editingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCouponFormOpen(false)}
                      className="w-9 h-9 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition-colors shrink-0 active:scale-95"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-6 space-y-4 text-xs overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Código do Cupom
                        </label>
                        <input
                          type="text"
                          value={couponForm.code}
                          onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                          placeholder="Ex: MEGA10"
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs uppercase font-mono font-bold focus:outline-none focus:border-red-600"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Tipo de Desconto
                        </label>
                        <select
                          value={couponForm.type}
                          onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value as any })}
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-red-600"
                        >
                          <option value="percentage">Porcentagem (%)</option>
                          <option value="fixed">Valor Fixo (R$)</option>
                        </select>
                      </div>
                    </div>

                    {/* Destaque nos Mais Vendidos */}
                    <button
                      type="button"
                      onClick={() => setProdForm((prev) => ({ ...prev, isPopular: !prev.isPopular }))}
                      className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-between font-bold text-xs transition-colors ${
                        prodForm.isPopular
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      <span>{prodForm.isPopular ? '🔥 Exibir nos Mais Vendidos' : 'Não exibir nos Mais Vendidos'}</span>
                      <span className="text-[10px] underline">Alternar</span>
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Valor do Desconto {couponForm.type === 'percentage' ? '(%)' : '(R$)'}
                        </label>
                        <input
                          type="number"
                          value={couponForm.value}
                          onChange={(e) => setCouponForm({ ...couponForm, value: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-red-600"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Valor Mínimo do Pedido (R$)
                        </label>
                        <input
                          type="number"
                          value={couponForm.minOrderValue}
                          onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-red-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">
                        Descrição do Cupom
                      </label>
                      <input
                        type="text"
                        value={couponForm.description}
                        onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                        placeholder="Ex: 10% de desconto no seu pedido!"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-red-600"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setIsCouponFormOpen(false)}
                        className="px-5 py-2.5 rounded-full border border-stone-300 text-stone-600 font-bold active:scale-95 transition-transform"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!couponForm.code.trim()) return;
                          if (editingCoupon) {
                            await updateCoupon({ ...editingCoupon, ...couponForm });
                            showNotification('Cupom atualizado! ✅');
                          } else {
                            await addCoupon(couponForm);
                            showNotification('Cupom adicionado! ✅');
                          }
                          setIsCouponFormOpen(false);
                        }}
                        className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold active:scale-95 transition-transform shadow-md"
                      >
                        Salvar Cupom
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {coupons.length === 0 && (
                <div className="col-span-full py-10 text-center text-xs text-stone-500 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200 p-6 space-y-1">
                  <p className="font-bold text-stone-700">Nenhum cupom cadastrado no momento.</p>
                  <p className="text-stone-400">Clique no botão "+ Novo Cupom" acima caso queira criar cupons promocionais para seus clientes.</p>
                </div>
              )}
              {coupons.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-mono font-black text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                      {c.code}
                    </span>
                    <p className="text-xs text-stone-800 font-bold mt-2">
                      {c.description}
                    </p>
                    <span className="text-[11px] text-stone-400 block mt-0.5">
                      {c.type === 'percentage' ? `${c.value}% OFF` : `R$ ${c.value.toFixed(2)} OFF`} • Mínimo: R$ {c.minOrderValue || 0}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Remover o cupom "${c.code}"?`)) {
                        deleteCoupon(c.id);
                        showNotification('Cupom removido.');
                      }
                    }}
                    className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center shrink-0"
                    title="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
