import type { PresentationDraft, CommercialInfo } from "@/lib/catalog/presentations";

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  short_description: string | null;
  description: string | null;
  presentation?: string | null;
  viscosity?: string | null;
  type?: string | null;
  subcategory_id?: string | null;
  subcategoryId?: string | null;
  subcategory?: string | null;
  stock: number;
  is_featured: boolean;
  is_active: boolean;
  category_id?: string | null;
  brand_id?: string | null;
  image_url?: string | null;
  image_is_placeholder?: boolean | null;
  stock_min?: number | null;
  price?: number | null;
  family?: string | null;
  attributes?: Record<string, string> | null;
  commercial?: CommercialInfo | null;
  presentations?: PresentationDraft[] | null;
  created_at: string;
  updated_at?: string;
  sort_order?: number;
  line_group_id?: string | null;
}
