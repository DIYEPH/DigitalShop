export type ShopMemberRole = "OWNER" | "MANAGER" | "STAFF";

export type CurrentShop = {
  id: string;
  name: string;
  slug: string;
  status: string;
  member_role: ShopMemberRole;
};
