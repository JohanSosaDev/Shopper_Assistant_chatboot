import type { GetOrderStatusInput, GetOrderStatusResult } from '../../models/order.js';
import type { SearchProductsInput, SearchProductsResult } from '../../models/product.js';

export interface ISFCCClient {
  getOrderStatus(input: GetOrderStatusInput): Promise<GetOrderStatusResult>;
  searchProducts(input: SearchProductsInput): Promise<SearchProductsResult>;
}

export async function createSfccClient(mode: 'real' | 'mock', config: {
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  fixturesPath?: string;
}): Promise<ISFCCClient> {
  if (mode === 'mock') {
    const { createMockSfccClient } = await import('./mock-sfcc-client.js');
    return createMockSfccClient(config.fixturesPath);
  }

  const { createRealSfccClient } = await import('./real-sfcc-client.js');
  return createRealSfccClient({
    baseUrl: config.baseUrl!,
    clientId: config.clientId!,
    clientSecret: config.clientSecret!,
  });
}
