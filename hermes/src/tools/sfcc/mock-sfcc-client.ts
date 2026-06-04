import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ISFCCClient } from './sfcc-client.js';
import type { GetOrderStatusInput, GetOrderStatusResult, OrderStatusOutput } from '../../models/order.js';

export function createMockSfccClient(fixturesPath?: string): ISFCCClient {
  const path = fixturesPath ?? join(process.cwd(), 'fixtures', 'demo-orders.json');
  const raw = readFileSync(path, 'utf-8');
  const orders: OrderStatusOutput[] = JSON.parse(raw);

  return {
    async getOrderStatus(input: GetOrderStatusInput): Promise<GetOrderStatusResult> {
      const order = orders.find((o) => o.order_id === input.order_id);

      if (!order) {
        return { not_found: true } as const;
      }

      return order;
    },
  };
}
