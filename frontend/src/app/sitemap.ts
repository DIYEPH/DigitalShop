import type { MetadataRoute } from "next";
import { safeListProducts } from "@/lib/api/products";
import { safeListCategories } from "@/lib/api/categories";
import { routePath } from "@/lib/i18n/routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://digitalshop.com";
  
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/vi`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/vi/products`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/products`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  // Get dynamic product routes
  const [viProducts, enProducts] = await Promise.all([
    safeListProducts({ lang: "vi", page: 1, limit: 1000 }),
    safeListProducts({ lang: "en", page: 1, limit: 1000 }),
  ]);

  const productRoutes: MetadataRoute.Sitemap = [];
  
  if (!viProducts.error && viProducts.items) {
    viProducts.items.forEach((product) => {
      productRoutes.push({
        url: `${baseUrl}${routePath("vi", "product", product.slug)}`,
        lastModified: new Date(product.updated_at || product.created_at),
        changeFrequency: "daily",
        priority: 0.8,
      });
    });
  }

  if (!enProducts.error && enProducts.items) {
    enProducts.items.forEach((product) => {
      productRoutes.push({
        url: `${baseUrl}${routePath("en", "product", product.slug)}`,
        lastModified: new Date(product.updated_at || product.created_at),
        changeFrequency: "daily",
        priority: 0.8,
      });
    });
  }

  // Get category routes
  const [viCategories, enCategories] = await Promise.all([
    safeListCategories("vi"),
    safeListCategories("en"),
  ]);

  const categoryRoutes: MetadataRoute.Sitemap = [];
  
  viCategories.forEach((category) => {
    categoryRoutes.push({
      url: `${baseUrl}${routePath("vi", "category", category.slug)}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  enCategories.forEach((category) => {
    categoryRoutes.push({
      url: `${baseUrl}${routePath("en", "category", category.slug)}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}