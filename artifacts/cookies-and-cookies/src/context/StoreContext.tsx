import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  type Product,
  type Coupon,
  type StoreInfo,
  type HeroInfo,
  type CategoryItem,
  INITIAL_PRODUCTS,
  INITIAL_POPULAR_PRODUCT_IDS,
  INITIAL_COUPONS,
  INITIAL_STORE_INFO,
  INITIAL_HERO,
  INITIAL_CATEGORIES,
  cleanProductImage,
  isGhostImage,
  normalizeImages,
  isGhostCoupon,
} from '../data/menu';
import { supabase, uploadProductImageToStorage, uploadBase64ImageToStorage } from '../lib/supabase';

interface StoreContextType {
  products: Product[];
  popularProductIds: string[];
  coupons: Coupon[];
  storeInfo: StoreInfo;
  heroInfo: HeroInfo;
  categories: CategoryItem[];
  activeCouponsCount: number;

  // Produtos
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;

  // Mais Vendidos
  setPopularProductIds: (ids: string[]) => void;
  togglePopularProduct: (productId: string) => void;
  addPopularProduct: (productId: string) => void;
  removePopularProduct: (productId: string) => void;
  reorderPopularProduct: (productId: string, direction: 'up' | 'down') => void;
  isProductPopular: (productId: string) => boolean;

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

  // Upload de Imagens e Sincronização
  processImageFile: (file: File) => Promise<string>;
  syncAllToSupabase: () => Promise<{ success: boolean; count: number; error?: string }>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'megalanche_galvao_products_v6',
  POPULAR_IDS: 'megalanche_galvao_popular_ids_v1',
  COUPONS: 'megalanche_galvao_coupons_v6',
  STORE_INFO: 'megalanche_galvao_store_info_v6',
  HERO_INFO: 'megalanche_galvao_hero_info_v6',
  CATEGORIES: 'megalanche_galvao_categories_v6',
};

// Limpeza de chaves antigas que continham fotos mock / enraizadas ou versões anteriores
try {
  [
    'charneski_products_v2',
    'charneski_coupons_v2',
    'charneski_store_info_v2',
    'charneski_hero_info_v2',
    'megalanche_galvao_products_v1',
    'megalanche_galvao_products_v3',
    'megalanche_galvao_products_v5',
    'megalanche_galvao_hero_info_v5',
    'megalanche_galvao_categories_v5',
  ].forEach((k) => localStorage.removeItem(k));
} catch {}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) {
        const parsed: Product[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((prod) => {
            const cleanImg = cleanProductImage(prod.image);
            const cleanImgs = normalizeImages(prod.images);
            return {
              ...prod,
              image: cleanImg,
              images: cleanImgs.length > 0 ? cleanImgs : (cleanImg ? [cleanImg] : []),
              options: (prod.options || []).map((opt) => ({
                ...opt,
                images: normalizeImages(opt.images),
              })),
            };
          });
        }
      }
      return INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [popularProductIds, setPopularProductIdsState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.POPULAR_IDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return INITIAL_POPULAR_PRODUCT_IDS;
    } catch {
      return INITIAL_POPULAR_PRODUCT_IDS;
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
      if (saved) {
        const parsed: Coupon[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c) => !isGhostCoupon(c));
        }
      }
      return INITIAL_COUPONS;
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
      localStorage.setItem(STORAGE_KEYS.POPULAR_IDS, JSON.stringify(popularProductIds));
    } catch (e) {
      console.warn('Falha ao salvar mais vendidos no localStorage:', e);
    }
  }, [popularProductIds]);

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
          const mappedProducts: Product[] = dbProducts.map((p: any) => {
            const cleanImg = cleanProductImage(p.image);
            const cleanImgs = normalizeImages(p.images);
            return {
              id: p.id,
              name: p.name || '',
              tagline: p.tagline || '',
              description: p.description || '',
              category: p.category || 'Lanches',
              image: cleanImg,
              images: cleanImgs.length > 0 ? cleanImgs : (cleanImg ? [cleanImg] : []),
              available: p.available ?? true,
              ingredientsBadge: p.ingredients_badge ?? p.ingredientsBadge ?? '',
              options: (p.options || []).map((o: any) => ({
                ...o,
                images: normalizeImages(o.images),
              })),
            };
          });

          // Atualiza lista garantindo que fotos legítimas do Supabase prevaleçam
          setProducts((prev) => {
            const base = prev && prev.length > 0 ? prev : INITIAL_PRODUCTS;
            const merged = base.map((p) => {
              const found = mappedProducts.find((dbP) => dbP.id === p.id);
              if (!found) return p;
              // Se o produto local do usuário possui foto modificada recém colocada (data:image), preserva
              if (p.image && p.image.startsWith('data:image/')) {
                return { ...found, ...p, image: p.image };
              }
              return { ...p, ...found };
            });
            const additions = mappedProducts.filter((dbP) => !base.some((p) => p.id === dbP.id));
            const finalList = [...merged, ...additions];

            // Envia qualquer foto base64 pendente em segundo plano para o Supabase Storage
            setTimeout(async () => {
              for (const item of finalList) {
                if (item.image && item.image.startsWith('data:image/')) {
                  try {
                    const cloudUrl = await uploadBase64ImageToStorage(item.image);
                    if (cloudUrl) {
                      item.image = cloudUrl;
                      await supabase.from('megalanche_products').upsert([{
                        id: item.id,
                        name: item.name,
                        tagline: item.tagline,
                        description: item.description,
                        category: item.category,
                        image: cloudUrl,
                        images: [cloudUrl],
                        available: item.available,
                        ingredients_badge: item.ingredientsBadge || '',
                        options: (item.options || []).map((o) => ({ ...o, images: [cloudUrl] })),
                      }]);
                      setProducts((curr) =>
                        curr.map((cp) => (cp.id === item.id ? { ...cp, image: cloudUrl } : cp))
                      );
                    }
                  } catch (e) {
                    console.warn('Erro ao subir imagem pendente:', e);
                  }
                }
              }
            }, 300);

            return finalList;
          });
        }

        const { data: dbCoupons, error: coupErr } = await supabase.from('megalanche_coupons').select('*');
        if (!coupErr && Array.isArray(dbCoupons)) {
          const mappedCoupons: Coupon[] = dbCoupons
            .filter((c: any) => !isGhostCoupon(c))
            .map((c: any) => ({
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

        const { data: dbSettings, error: setErr } = await supabase.from('megalanche_settings').select('*').limit(1).maybeSingle();
        if (!setErr && dbSettings) {
          // Carrega categorias salvas na nuvem para manter fotos sincronizadas em todos os navegadores
          if (dbSettings.top_alert_text && typeof dbSettings.top_alert_text === 'string' && dbSettings.top_alert_text.startsWith('[')) {
            try {
              const parsedCats: CategoryItem[] = JSON.parse(dbSettings.top_alert_text);
              if (Array.isArray(parsedCats) && parsedCats.length > 0) {
                setCategories(parsedCats);
                try {
                  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(parsedCats));
                } catch {}
              }
            } catch {}
          }

          setStoreInfo((prev) => ({
            ...prev,
            name: dbSettings.store_name || prev.name,
            tagline: dbSettings.tagline || prev.tagline,
            city: dbSettings.city || prev.city,
            address: dbSettings.address || prev.address,
            whatsappNumber: dbSettings.whatsapp_number || prev.whatsappNumber,
            whatsappDisplay: dbSettings.whatsapp_display || prev.whatsappDisplay,
            pixKey: dbSettings.pix_key || prev.pixKey,
            instagramHandle: dbSettings.instagram_handle || prev.instagramHandle,
            instagramUrl: dbSettings.instagram_url || prev.instagramUrl,
            logoImage: dbSettings.logo_image || prev.logoImage,
            openingHours: dbSettings.opening_hours || prev.openingHours,
            adminPin: dbSettings.admin_pin || prev.adminPin,
          }));

          // Carrega as configurações do Banner Principal e Secundário da nuvem
          setHeroInfo((prev) => ({
            ...prev,
            title: dbSettings.hero_title || prev.title,
            subtitle: dbSettings.hero_subtitle || prev.subtitle,
            badge: dbSettings.hero_badge ?? prev.badge,
            image: dbSettings.hero_image || prev.image,
            promoBannerTag: dbSettings.promo_banner_tag || prev.promoBannerTag,
            promoBannerTitle: dbSettings.promo_banner_title || prev.promoBannerTitle,
            promoBannerSubtitle: dbSettings.promo_banner_subtitle || prev.promoBannerSubtitle,
            promoBannerButton: dbSettings.promo_banner_button || prev.promoBannerButton,
          }));
        }
      } catch (err) {
        console.info('Supabase sync standby:', err);
      }
    }
    loadFromSupabase();
  }, []);

  const activeCouponsCount = coupons.filter((c) => c.isActive).length;

  // Processar arquivo de imagem (PNG, JPG, WebP) para Data URL otimizada
  // Tenta fazer upload para o Supabase Storage para sincronização entre dispositivos.
  // Em caso de falha, usa base64 local como fallback.
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
        img.onload = async () => {
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

          // Tenta fazer upload para o Supabase Storage (sincroniza entre dispositivos)
          try {
            const publicUrl = await uploadProductImageToStorage(file, compressed);
            if (publicUrl) {
              resolve(publicUrl);
              return;
            }
          } catch {
            // Falha silenciosa, usa fallback local
          }

          // Fallback: retorna base64 local (funciona apenas neste dispositivo)
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
        image: cleanProductImage(newProduct.image),
        images: normalizeImages(newProduct.images),
        available: newProduct.available,
        ingredients_badge: newProduct.ingredientsBadge || '',
        options: newProduct.options || [],
      };
      await supabase.from('megalanche_products').insert([payload]);
    } catch {}

    return newProduct;
  };

  const updateProduct = async (updated: Product) => {
    let finalProduct = { ...updated };
    if (finalProduct.image && finalProduct.image.startsWith('data:image/')) {
      try {
        const cloudUrl = await uploadBase64ImageToStorage(finalProduct.image);
        if (cloudUrl) {
          finalProduct.image = cloudUrl;
          finalProduct.images = [cloudUrl];
        }
      } catch {}
    } else {
      finalProduct.image = cleanProductImage(finalProduct.image);
      finalProduct.images = normalizeImages(finalProduct.images);
    }

    setProducts((prev) => prev.map((p) => (p.id === finalProduct.id ? finalProduct : p)));
    try {
      const payload = {
        id: finalProduct.id,
        name: finalProduct.name,
        tagline: finalProduct.tagline,
        description: finalProduct.description,
        category: finalProduct.category,
        image: finalProduct.image,
        images: finalProduct.images || [],
        available: finalProduct.available,
        ingredients_badge: finalProduct.ingredientsBadge || '',
        options: finalProduct.options || [],
      };
      await supabase.from('megalanche_products').upsert([payload]);
    } catch {}
  };

  const deleteProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setPopularProductIdsState((prev) => prev.filter((id) => id !== productId));
    try {
      await supabase.from('megalanche_products').delete().eq('id', productId);
    } catch {}
  };

  // Funções de Mais Vendidos
  const setPopularProductIds = (ids: string[]) => {
    setPopularProductIdsState(ids);
  };

  const addPopularProduct = (productId: string) => {
    setPopularProductIdsState((prev) => {
      if (prev.includes(productId)) return prev;
      return [...prev, productId];
    });
  };

  const removePopularProduct = (productId: string) => {
    setPopularProductIdsState((prev) => prev.filter((id) => id !== productId));
  };

  const togglePopularProduct = (productId: string) => {
    setPopularProductIdsState((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const reorderPopularProduct = (productId: string, direction: 'up' | 'down') => {
    setPopularProductIdsState((prev) => {
      const index = prev.indexOf(productId);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const isProductPopular = (productId: string) => {
    return popularProductIds.includes(productId);
  };

  // Funções de Categorias com persistência na nuvem
  const updateCategory = async (updated: CategoryItem) => {
    let finalIcon = updated.icon;
    if (finalIcon && finalIcon.startsWith('data:image/')) {
      try {
        const cloudUrl = await uploadBase64ImageToStorage(finalIcon);
        if (cloudUrl) {
          finalIcon = cloudUrl;
        }
      } catch (e) {
        console.warn('Erro ao subir imagem da categoria:', e);
      }
    }
    const cleanCat: CategoryItem = { ...updated, icon: finalIcon };
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === cleanCat.id ? cleanCat : c));
      try {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(next));
      } catch {}
      supabase
        .from('megalanche_settings')
        .update({ top_alert_text: JSON.stringify(next) })
        .eq('id', 'default')
        .then(() => {})
        .catch(() => {});
      return next;
    });
  };

  const addCategory = async (catData: Omit<CategoryItem, 'id'>) => {
    let finalIcon = catData.icon;
    if (finalIcon && finalIcon.startsWith('data:image/')) {
      try {
        const cloudUrl = await uploadBase64ImageToStorage(finalIcon);
        if (cloudUrl) {
          finalIcon = cloudUrl;
        }
      } catch {}
    }
    const newId = `cat-${Date.now().toString(36)}`;
    const newCat: CategoryItem = { ...catData, id: newId, icon: finalIcon };
    setCategories((prev) => {
      const next = [...prev, newCat];
      try {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(next));
      } catch {}
      supabase
        .from('megalanche_settings')
        .update({ top_alert_text: JSON.stringify(next) })
        .eq('id', 'default')
        .then(() => {})
        .catch(() => {});
      return next;
    });
  };

  const deleteCategory = async (categoryId: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== categoryId);
      try {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(next));
      } catch {}
      supabase
        .from('megalanche_settings')
        .update({ top_alert_text: JSON.stringify(next) })
        .eq('id', 'default')
        .then(() => {})
        .catch(() => {});
      return next;
    });
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

  // Sincronizar TUDO para o Supabase (produtos, cupons, configurações e banner)
  const syncAllToSupabase = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    let syncedCount = 0;
    try {
      // 1. Sincronizar todos os produtos (apenas fotos reais)
      for (const prod of products) {
        let finalImage = prod.image;

        // Se a imagem é base64, faz upload para o Storage primeiro
        if (finalImage && finalImage.startsWith('data:image/')) {
          try {
            const cloudUrl = await uploadBase64ImageToStorage(finalImage);
            if (cloudUrl) {
              finalImage = cloudUrl;
              setProducts((prev) =>
                prev.map((p) => (p.id === prod.id ? { ...p, image: cloudUrl, images: [cloudUrl] } : p))
              );
            }
          } catch (imgErr) {
            console.warn('Erro ao subir imagem do produto', prod.id, imgErr);
          }
        } else {
          finalImage = cleanProductImage(finalImage);
        }

        // Faz upsert do produto no Supabase
        const payload = {
          id: prod.id,
          name: prod.name,
          tagline: prod.tagline,
          description: prod.description,
          category: prod.category,
          image: finalImage,
          images: finalImage ? [finalImage] : [],
          available: prod.available,
          ingredients_badge: prod.ingredientsBadge || '',
          options: (prod.options || []).map((o) => ({
            ...o,
            images: finalImage ? [finalImage] : [],
          })),
        };

        const { error: upsertErr } = await supabase.from('megalanche_products').upsert([payload]);
        if (!upsertErr) {
          syncedCount++;
        } else {
          console.warn('Erro upsert produto', prod.id, upsertErr);
        }
      }

      // 2. Sincronizar cupons
      try {
        await supabase.from('megalanche_coupons').delete().in('id', ['cupom-mega10', 'cupom-primeira-compra', 'cupom-mega-barca']);
      } catch {}

      for (const coupon of coupons) {
        if (isGhostCoupon(coupon)) continue;
        await supabase.from('megalanche_coupons').upsert([{
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          type: coupon.type,
          value: coupon.value,
          min_order_value: coupon.minOrderValue || 0,
          is_active: coupon.isActive,
        }]);
      }

      // 3. Sincronizar fotos e configurações das categorias
      let finalCategories = categories;
      try {
        finalCategories = await Promise.all(
          categories.map(async (cat) => {
            if (cat.icon && cat.icon.startsWith('data:image/')) {
              try {
                const cloudCat = await uploadBase64ImageToStorage(cat.icon);
                if (cloudCat) return { ...cat, icon: cloudCat };
              } catch {}
            }
            return cat;
          })
        );
        setCategories(finalCategories);
        try {
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(finalCategories));
        } catch {}
      } catch {}

      // 4. Sincronizar configurações da loja e Banner Principal
      let finalHeroImage = heroInfo.image;
      if (finalHeroImage && finalHeroImage.startsWith('data:image/')) {
        try {
          const cloudHero = await uploadBase64ImageToStorage(finalHeroImage);
          if (cloudHero) {
            finalHeroImage = cloudHero;
            setHeroInfo((prev) => ({ ...prev, image: cloudHero }));
          }
        } catch {}
      }

      let finalLogoImage = storeInfo.logoImage;
      if (finalLogoImage && finalLogoImage.startsWith('data:image/')) {
        try {
          const cloudLogo = await uploadBase64ImageToStorage(finalLogoImage);
          if (cloudLogo) {
            finalLogoImage = cloudLogo;
            setStoreInfo((prev) => ({ ...prev, logoImage: cloudLogo }));
          }
        } catch {}
      }

      await supabase.from('megalanche_settings').upsert([{
        id: 'default',
        store_name: storeInfo.name,
        tagline: storeInfo.tagline,
        city: storeInfo.city,
        address: storeInfo.address,
        whatsapp_number: storeInfo.whatsappNumber,
        whatsapp_display: storeInfo.whatsappDisplay,
        pix_key: storeInfo.pixKey,
        instagram_handle: storeInfo.instagramHandle,
        instagram_url: storeInfo.instagramUrl,
        logo_image: finalLogoImage,
        top_alert_text: JSON.stringify(finalCategories),
        opening_hours: storeInfo.openingHours,
        admin_pin: storeInfo.adminPin,
        hero_title: heroInfo.title,
        hero_subtitle: heroInfo.subtitle,
        hero_badge: heroInfo.badge,
        hero_image: finalHeroImage,
        promo_banner_tag: heroInfo.promoBannerTag,
        promo_banner_title: heroInfo.promoBannerTitle,
        promo_banner_subtitle: heroInfo.promoBannerSubtitle,
        promo_banner_button: heroInfo.promoBannerButton,
      }]);

      return { success: true, count: syncedCount };
    } catch (err: any) {
      console.error('Erro ao sincronizar com Supabase:', err);
      return { success: false, count: syncedCount, error: err?.message || 'Erro desconhecido' };
    }
  };

  // Configurações da Loja
  const updateStoreInfo = async (info: Partial<StoreInfo>) => {
    let finalLogo = info.logoImage;
    if (finalLogo && finalLogo.startsWith('data:image/')) {
      try {
        const cloudUrl = await uploadBase64ImageToStorage(finalLogo);
        if (cloudUrl) {
          finalLogo = cloudUrl;
        }
      } catch {}
    }

    setStoreInfo((prev) => {
      const updated = { ...prev, ...info, ...(finalLogo ? { logoImage: finalLogo } : {}) };
      supabase.from('megalanche_settings').upsert([{
        id: 'default',
        store_name: updated.name,
        tagline: updated.tagline,
        city: updated.city,
        address: updated.address,
        whatsapp_number: updated.whatsappNumber,
        whatsapp_display: updated.whatsappDisplay,
        pix_key: updated.pixKey,
        instagram_handle: updated.instagramHandle,
        instagram_url: updated.instagramUrl,
        logo_image: updated.logoImage,
        opening_hours: updated.openingHours,
        admin_pin: updated.adminPin,
      }]).then(() => {}).catch(() => {});
      return updated;
    });
  };

  // Configurações do Hero / Banner Principal
  const updateHeroInfo = async (info: Partial<HeroInfo>) => {
    let finalHero = { ...heroInfo, ...info };

    // Se houver imagem base64, faz upload para o Supabase Storage
    if (finalHero.image && finalHero.image.startsWith('data:image/')) {
      try {
        const cloudUrl = await uploadBase64ImageToStorage(finalHero.image);
        if (cloudUrl) {
          finalHero.image = cloudUrl;
        }
      } catch (e) {
        console.warn('Erro ao subir imagem do hero:', e);
      }
    }

    setHeroInfo(finalHero);

    // Salva imediatamente no Supabase megalanche_settings
    try {
      await supabase.from('megalanche_settings').upsert([{
        id: 'default',
        hero_title: finalHero.title,
        hero_subtitle: finalHero.subtitle,
        hero_badge: finalHero.badge,
        hero_image: finalHero.image,
        promo_banner_tag: finalHero.promoBannerTag,
        promo_banner_title: finalHero.promoBannerTitle,
        promo_banner_subtitle: finalHero.promoBannerSubtitle,
        promo_banner_button: finalHero.promoBannerButton,
      }]);
    } catch (e) {
      console.warn('Erro ao salvar hero no Supabase:', e);
    }
  };

  const resetToDefaults = () => {
    setProducts(INITIAL_PRODUCTS);
    setPopularProductIdsState(INITIAL_POPULAR_PRODUCT_IDS);
    setCategories(INITIAL_CATEGORIES);
    setCoupons(INITIAL_COUPONS);
    setStoreInfo(INITIAL_STORE_INFO);
    setHeroInfo(INITIAL_HERO);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.POPULAR_IDS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.COUPONS);
    localStorage.removeItem(STORAGE_KEYS.STORE_INFO);
    localStorage.removeItem(STORAGE_KEYS.HERO_INFO);
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        popularProductIds,
        categories,
        coupons,
        storeInfo,
        heroInfo,
        activeCouponsCount,
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
        validateCoupon,
        updateStoreInfo,
        updateHeroInfo,
        resetToDefaults,
        processImageFile,
        syncAllToSupabase,
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
