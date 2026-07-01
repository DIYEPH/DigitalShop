export type AdminUser = {
  id: number;
  email: string;
  role: string;
  full_name: string | null;
  can_create_shop: boolean;
};

export type AdminShopMembership = {
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  shop_status: string;
  member_role: string;
};
