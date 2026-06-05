// product.ts
// Schemas del tool search_products (M3 SFCC Integrations — Fase 2 placeholder
// implementado como mini-feature para Demo Day per branch feature/product-recommendations).
// Permite que el cliente busque productos en el catálogo del brand y reciba
// recomendaciones contextualizadas.

import { z } from 'zod';

// ===========================================================================
// Tool input
// ===========================================================================

export const SearchProductsInputSchema = z.object({
  /** Mensaje libre del cliente, e.g. "busco una camisa azul talla M" */
  query: z.string().min(1).max(500),
  /** Cantidad máxima de resultados a devolver. Default 3 para no inflar contexto. */
  limit: z.number().int().positive().max(10).default(3),
});

export type SearchProductsInput = z.infer<typeof SearchProductsInputSchema>;

// ===========================================================================
// Tool output (lo que el catálogo retorna)
// ===========================================================================

export const ProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  target: z.enum(['hombre', 'mujer', 'unisex']),
  colors: z.array(z.string()).min(1),
  sizes: z.array(z.string()).min(1),
  price: z.string(),
  description: z.string(),
});

export type Product = z.infer<typeof ProductSchema>;

export const SearchProductsResultSchema = z.object({
  products: z.array(ProductSchema),
  total_matched: z.number().int().nonnegative(),
});

export type SearchProductsResult = z.infer<typeof SearchProductsResultSchema>;
