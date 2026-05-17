import type { StoreSidebarProps } from "./store-sidebar.types";

type UseStoreSidebarParams = Pick<
  StoreSidebarProps,
  "categories" | "hotLimit"
>;

export function useStoreSidebar({
  categories,
  hotLimit = 6,
}: UseStoreSidebarParams) {
  const parentToChildren = new Map<number, typeof categories>();

  for (const category of categories) {
    if (typeof category.parent_id !== "number") continue;
    const children = parentToChildren.get(category.parent_id) ?? [];
    children.push(category);
    parentToChildren.set(category.parent_id, children);
  }

  const rootCategories = categories.filter((category) => category.parent_id === null);
  const roots = rootCategories.slice(0, hotLimit);
  const hasMore = rootCategories.length > roots.length;

  return {
    roots,
    hasMore,
    parentToChildren,
  };
}

