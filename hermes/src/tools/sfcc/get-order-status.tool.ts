import type { ToolSpec } from '../tool-registry.js';
import type { ISFCCClient } from './sfcc-client.js';
import { GetOrderStatusInputSchema } from '../../models/order.js';

export function createGetOrderStatusTool(sfccClient: ISFCCClient): ToolSpec {
  return {
    name: 'get_order_status',
    description: 'Obtiene el estado actual de un pedido por número de orden',
    async execute(input: unknown) {
      const parsed = GetOrderStatusInputSchema.parse(input);
      return sfccClient.getOrderStatus(parsed);
    },
  };
}
