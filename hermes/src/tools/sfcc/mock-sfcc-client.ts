import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { ISFCCClient } from './sfcc-client.js';
import type { GetOrderStatusInput, GetOrderStatusResult, OrderStatusOutput } from '../../models/order.js';
import type { Product, SearchProductsInput, SearchProductsResult } from '../../models/product.js';

export function createMockSfccClient(fixturesPath?: string): ISFCCClient {
  const ordersPath = fixturesPath ?? join(process.cwd(), 'fixtures', 'demo-orders.json');
  const productsPath = join(dirname(ordersPath), 'demo-products.json');

  const orders: OrderStatusOutput[] = JSON.parse(readFileSync(ordersPath, 'utf-8'));

  let products: Product[] = [];
  try {
    products = JSON.parse(readFileSync(productsPath, 'utf-8'));
  } catch {
    // Fixture opcional: si no existe, searchProducts devuelve vacío.
    products = [];
  }

  return {
    async getOrderStatus(input: GetOrderStatusInput): Promise<GetOrderStatusResult> {
      const order = orders.find((o) => o.order_id === input.order_id);
      if (!order) {
        return { not_found: true } as const;
      }
      return order;
    },

    async searchProducts(input: SearchProductsInput): Promise<SearchProductsResult> {
      const tokens = normalizeTokens(input.query);
      const scored = products
        .map((p) => ({ product: p, score: scoreProduct(p, tokens) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);

      return {
        products: scored.slice(0, input.limit ?? 3).map((s) => s.product),
        total_matched: scored.length,
      };
    },
  };
}

// ===========================================================================
// Helpers de matching (keyword scoring simple, sin LLM ni embeddings)
// ===========================================================================

// Stemming primitivo: quita 's' final de palabras > 3 chars para matchear plurales.
// "jeans" -> "jean", "vestidos" -> "vestido", "negros" -> "negro", "azules" -> "azule" (acepta falsos positivos para keep it simple).
function stem(word: string): string {
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function normalizeTokens(query: string): string[] {
  const stripped = normalizeText(query).replace(/[^\w\s]/g, ' ');
  const words = stripped.split(/\s+/).filter(Boolean);
  const STOPWORDS = new Set([
    'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las',
    'de', 'del', 'al', 'y', 'o', 'que', 'para', 'por',
    'busco', 'quiero', 'tienes', 'tienen', 'hay', 'venden',
    'mi', 'tu', 'su', 'me', 'en', 'con', 'sin',
    'recomienda', 'recomiendame', 'sugiere', 'muestrame', 'muestrenme',
    'algo', 'algun', 'alguna', 'puede', 'podria',
    'estoy', 'buscando', 'quisiera', 'necesito',
  ]);
  return Array.from(
    new Set(
      words
        .filter((w) => w.length > 2 && !STOPWORDS.has(w))
        .map(stem),
    ),
  );
}

function scoreProduct(product: Product, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  // Stemear el searchable también para que matchee con tokens stemados.
  const searchable = normalizeText([
    product.name,
    product.category,
    product.target,
    ...product.colors,
    ...product.sizes,
    product.description,
  ].join(' '))
    .split(/\s+/)
    .map(stem)
    .join(' ');

  let score = 0;
  for (const token of tokens) {
    if (searchable.includes(token)) score += 1;
    // Bonus: match exacto de categoría (también stemado)
    if (stem(normalizeText(product.category)) === token) score += 2;
    // Bonus: match de target
    if (normalizeText(product.target) === token) score += 1;
  }
  return score;
}
