export type Product = {
  id: number;
  name_en: string;
  name_vi: string;
  slug: string;
  price_usdt: number;
  price_vnd: number;
  name?: string;
  price?: number;
  currency?: string;
  image_url?: string | null;
  category?: { id: number; name: string; slug: string } | null;
};

export type Category = { id: number; name: string; slug: string };

export type ProductForm = {
  nameEn: string;
  nameVi: string;
  descriptionEn: string;
  descriptionVi: string;
  imageUrl: string;
  categoryId: number | "";
};
