export interface Category {
  id: number;
  slug: string;
  name: string;
  image_url?: string | null;
  products_count?: number;
  parent_id: number | null;
  parent?: { id: number; slug: string; name: string };
  children?: Category[];
}


