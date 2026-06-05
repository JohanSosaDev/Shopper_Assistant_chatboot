import type { ToolSpec } from '../tool-registry.js';
import type { ISFCCClient } from './sfcc-client.js';
import { SearchProductsInputSchema } from '../../models/product.js';

export function createSearchProductsTool(sfccClient: ISFCCClient): ToolSpec {
  return {
    name: 'search_products',
    description: 'Busca productos del catálogo Patprimo por keywords (categoría, color, target, talla)',
    async execute(input: unknown) {
      const parsed = SearchProductsInputSchema.parse(input);
      return sfccClient.searchProducts(parsed);
    },
  };
}
