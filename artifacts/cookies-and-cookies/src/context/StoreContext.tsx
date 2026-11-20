import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  type Product,
  type Coupon,
  type StoreInfo,
  type HeroInfo,
  type CategoryItem,
  INITIAL_PRODUCTS,
  INITIAL_COUPONS,
  INITIAL_STORE_INFO,
  INITIAL_HERO,
  INITIAL_CATEGORIES,
} from '../data/menu';
import { supabase } from '../lib/supabase';

interface StoreContextType {
  products: Product[];
  coupons: Coupon[];
  storeInfo: StoreInfo;
  heroInfo: HeroInfo;
  categories: CategoryItem[];
  activeCouponsCount: number;

  // Produtos
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;

  // Categorias
  updateCategory: (category: CategoryItem) => Promise<void>;
  addCategory: (category: Omit<CategoryItem, 'id'>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;

  // Cupons
  addCoupon: (coupon: Omit<Coupon, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateCoupon: (coupon: Coupon) => Promise<{ success: boolean; error?: string }>;
  deleteCoupon: (couponId: string) => Promise<void>;
  validateCoupon: (code: string, currentTotal: number) => { valid: boolean; coupon?: Coupon; discount: number; message: string };

  // Configurações
  updateStoreInfo: (info: Partial<StoreInfo>) => Promise<void>;
  updateHeroInfo: (info: Partial<HeroInfo>) => Promise<void>;
  resetToDefaults: () => void;

  // Upload de Imagens
  processImageFile: (file: File) => Promise<string>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'megalanche_galvao_products_v5',
  COUPONS: 'megalanche_galvao_coupons_v5',
  STORE_INFO: 'megalanche_galvao_store_info_v6',
  HERO_INFO: 'megalanche_galvao_hero_info_v5',
  CATEGORIES: 'megalanche_galvao_categories_v5',
};

// Limpeza de chaves antigas que continham "charneski" ou versões anteriores
try {
  [
    'charneski_products_v2',
    'charneski_coupons_v2',
    'charneski_store_info_v2',
    'charneski_hero_info_v2',
    'megalanche_galvao_products_v1',
    'megalanche_galvao_products_v3',
  ].forEach((k) => localStorage.removeItem(k));
} catch {}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) {
        const parsed: Product[] = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          !parsed.some((p) => p.category?.toLowerCase().includes('palha') || p.id.includes('palha'))
        ) {
          return parsed.map((prod) => ({
            ...prod,
            options: (prod.options || []).map((opt) => {
              if (!opt.images || opt.images.length === 0) {
                return { ...opt, images: [prod.image] };
              }
              return opt;
            }),
          }));
        }
      }
      return INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) {
        const parsed: CategoryItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COUPONS);
      return saved ? JSON.parse(saved) : INITIAL_COUPONS;
    } catch {
      return INITIAL_COUPONS;
    }
  });

  const [storeInfo, setStoreInfo] = useState<StoreInfo>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STORE_INFO) || localStorage.getItem('megalanche_galvao_store_info_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_STORE_INFO,
          ...parsed,
          address: parsed.address && !parsed.address.includes('Disk') ? parsed.address : INITIAL_STORE_INFO.address,
          whatsappNumber: parsed.whatsappNumber === '5511999999999' ? INITIAL_STORE_INFO.whatsappNumber : (parsed.whatsappNumber || INITIAL_STORE_INFO.whatsappNumber),
          whatsappDisplay: parsed.whatsappDisplay === '(11) 99999-9999' ? INITIAL_STORE_INFO.whatsappDisplay : (parsed.whatsappDisplay || INITIAL_STORE_INFO.whatsappDisplay),
          pixKey: parsed.pixKey || INITIAL_STORE_INFO.pixKey,
          city: parsed.city === 'Disk Delivery & Retirada' ? INITIAL_STORE_INFO.city : (parsed.city || INITIAL_STORE_INFO.city),
          instagramHandle: parsed.instagramHandle || INITIAL_STORE_INFO.instagramHandle,
          instagramUrl: (!parsed.instagramUrl || parsed.instagramUrl === 'https://instagram.com') ? INITIAL_STORE_INFO.instagramUrl : parsed.instagramUrl,
          deliveryTimeEstimate: '',
          pickupTimeEstimate: '',
          adminPin: parsed.adminPin || 'Galvao2026On',
        };
      }
      return INITIAL_STORE_INFO;
    } catch {
      return INITIAL_STORE_INFO;
    }
  });

  const [heroInfo, setHeroInfo] = useState<HeroInfo>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HERO_INFO);
      return saved ? { ...INITIAL_HERO, ...JSON.parse(saved) } : INITIAL_HERO;
    } catch {
      return INITIAL_HERO;
    }
  });

  // Salvar no localStorage sempre que houver alterações
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.warn('Falha ao salvar produtos no localStorage:', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.warn('Falha ao salvar categorias no localStorage:', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
    } catch (e) {
      console.warn('Falha ao salvar cupons no localStorage:', e);
    }
  }, [coupons]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STORE_INFO, JSON.stringify(storeInfo));
    } catch (e) {
      console.warn('Falha ao salvar storeInfo no localStorage:', e);
    }
  }, [storeInfo]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HERO_INFO, JSON.stringify(heroInfo));
    } catch (e) {
      console.warn('Falha ao salvar heroInfo no localStorage:', e);
    }
  }, [heroInfo]);

  // Tentativa de sincronização com o Supabase
  useEffect(() => {
    async function loadFromSupabase() {
      try {
        const { data: dbProducts, error: prodErr } = await supabase.from('megalanche_products').select('*');
        if (!prodErr && dbProducts && dbProducts.length > 0) {
          const mappedProducts: Product[] = dbProducts.map((p: any) => ({
            id: p.id,
            name: p.name,
            tagline: p.tagline,
            description: p.description,
            category: p.category,
            image: p.image,
            images: p.images,
            available: p.available,
            ingredientsBadge: p.ingredients_badge ?? p.ingredientsBadge,
            options: p.options || [],
          }));
          setProducts(mappedProducts);
        }

        const { data: dbCoupons, error: coupErr } = await supabase.from('megalanche_coupons').select('*');
        if (!coupErr && dbCoupons && dbCoupons.length > 0) {
          const mappedCoupons: Coupon[] = dbCoupons.map((c: any) => ({
            id: c.id,
            code: c.code,
            description: c.description,
            type: c.type,
            value: Number(c.value),
            minOrderValue: c.min_order_value ? Number(c.min_order_value) : undefined,
            isActive: c.is_active ?? true,
          }));
          setCoupons(mappedCoupons);
        }
      } catch (err) {
        console.info('Supabase sync standby:', err);
      }
    }
    loadFromSupabase();
  }, []);

  const activeCouponsCount = coupons.filter((c) => c.isActive).length;

  // Processar arquivo de imagem (PNG, JPG, WebP) para Data URL otimizada
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('O arquivo selecionado não é uma imagem válida.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          reject(new Error('Erro ao ler a imagem.'));
          return;
        }

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 900;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(result);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressed);
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = () => reject(new Error('Falha ao processar arquivo.'));
      reader.readAsDataURL(file);
    });
  };

  // Funções de Produtos
  const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    const slug = productData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const newId = `${slug}-${Date.now().toString(36)}`;
    const newProduct: Product = { ...productData, id: newId };

    setProducts((prev) => [newProduct, ...prev]);

    try {
      const payload = {
        id: newProduct.id,
        name: newProduct.name,
        tagline: newProduct.tagline,
        description: newProduct.description,
        category: newProduct.category,
        image: newProduct.image,
        images: newProduct.images || [],
        available: newProduct.available,
        ingredients_badge: newProduct.ingredientsBadge || '',
        options: newProduct.options || [],
      };
      await supabase.from('megalanche_products').insert([payload]);
    } catch {}

    return newProduct;
  };

  const updateProduct = async (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    try {
      const payload = {
        id: updated.id,
        name: updated.name,
        tagline: updated.tagline,
        description: updated.description,
        category: updated.category,
        image: updated.image,
        images: updated.images || [],
        available: updated.available,
        ingredients_badge: updated.ingredientsBadge || '',
        options: updated.options || [],
      };
      await supabase.from('megalanche_products').upsert([payload]);
    } catch {}
  };

  const deleteProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      await supabase.from('megalanche_products').delete().eq('id', productId);
    } catch {}
  };

  // Funções de Categorias
  const updateCategory = async (updated: CategoryItem) => {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const addCategory = async (catData: Omit<CategoryItem, 'id'>) => {
    const newId = `cat-${Date.now().toString(36)}`;
    setCategories((prev) => [...prev, { ...catData, id: newId }]);
  };

  const deleteCategory = async (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  };

  // Funções de Cupons
  const addCoupon = async (
    couponData: Omit<Coupon, 'id'>
  ): Promise<{ success: boolean; error?: string }> => {
    const codeClean = couponData.code.trim().toUpperCase();
    if (!codeClean) return { success: false, error: 'O código do cupom não pode ficar vazio.' };
    if (coupons.some((c) => c.code.toUpperCase() === codeClean)) {
      return { success: false, error: 'Já existe um cupom com esse código.' };
    }

    const newCoupon: Coupon = { ...couponData, id: `cupom-${Date.now().toString(36)}`, code: codeClean };
    setCoupons((prev) => [...prev, newCoupon]);

    try {
      await supabase.from('megalanche_coupons').insert([{
        id: newCoupon.id,
        code: newCoupon.code,
        description: newCoupon.description,
        type: newCoupon.type,
        value: newCoupon.value,
        min_order_value: newCoupon.minOrderValue || 0,
        is_active: newCoupon.isActive,
      }]);
    } catch {}

    return { success: true };
  };

  const updateCoupon = async (updated: Coupon): Promise<{ success: boolean; error?: string }> => {
    const codeClean = updated.code.trim().toUpperCase();
    if (coupons.some((c) => c.id !== updated.id && c.code.toUpperCase() === codeClean)) {
      return { success: false, error: 'Outro cupom já usa esse código.' };
    }
    const cleanCoupon: Coupon = { ...updated, code: codeClean };
    setCoupons((prev) => prev.map((c) => (c.id === cleanCoupon.id ? cleanCoupon : c)));

    try {
      await supabase.from('megalanche_coupons').upsert([{
        id: cleanCoupon.id,
        code: cleanCoupon.code,
        description: cleanCoupon.description,
        type: cleanCoupon.type,
        value: cleanCoupon.value,
        min_order_value: cleanCoupon.minOrderValue || 0,
        is_active: cleanCoupon.isActive,
      }]);
    } catch {}

    return { success: true };
  };

  const deleteCoupon = async (couponId: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    try {
      await supabase.from('megalanche_coupons').delete().eq('id', couponId);
    } catch {}
  };

  const validateCoupon = (
    code: string,
    currentTotal: number
  ): { valid: boolean; coupon?: Coupon; discount: number; message: string } => {
    const clean = code.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === clean);

    if (!found) {
      return { valid: false, discount: 0, message: 'Cupom não encontrado ou inválido.' };
    }
    if (!found.isActive) {
      return { valid: false, discount: 0, message: 'Este cupom não está mais ativo.' };
    }
    if (found.minOrderValue && currentTotal < found.minOrderValue) {
      return {
        valid: false,
        discount: 0,
        message: `Válido para pedidos a partir de R$ ${found.minOrderValue.toFixed(2)}.`,
      };
    }

    let calculatedDiscount = 0;
    if (found.type === 'percentage') {
      calculatedDiscount = (currentTotal * found.value) / 100;
    } else {
      calculatedDiscount = Math.min(found.value, currentTotal);
    }

    return {
      valid: true,
      coupon: found,
      discount: calculatedDiscount,
      message: `Cupom ${found.code} aplicado com sucesso!`,
    };
  };

  // Configurações
  const updateStoreInfo = async (info: Partial<StoreInfo>) => {
    setStoreInfo((prev) => ({ ...prev, ...info }));
  };

  const updateHeroInfo = async (info: Partial<HeroInfo>) => {
    setHeroInfo((prev) => ({ ...prev, ...info }));
  };

  const resetToDefaults = () => {
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setCoupons(INITIAL_COUPONS);
    setStoreInfo(INITIAL_STORE_INFO);
    setHeroInfo(INITIAL_HERO);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.COUPONS);
    localStorage.removeItem(STORAGE_KEYS.STORE_INFO);
    localStorage.removeItem(STORAGE_KEYS.HERO_INFO);
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        coupons,
        storeInfo,
        heroInfo,
        activeCouponsCount,
        addProduct,
        updateProduct,
        deleteProduct,
        updateCategory,
        addCategory,
        deleteCategory,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        validateCoupon,
        updateStoreInfo,
        updateHeroInfo,
        resetToDefaults,
        processImageFile,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore deve ser usado dentro de um StoreProvider');
  }
  return context;
}
