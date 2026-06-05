import { request } from 'undici';
import type { ISFCCClient } from './sfcc-client.js';
import type { GetOrderStatusInput, GetOrderStatusResult, OrderStatusOutput } from '../../models/order.js';
import type { SearchProductsInput, SearchProductsResult } from '../../models/product.js';

interface SfccTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export function createRealSfccClient(config: {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}): ISFCCClient {
  let cachedToken: { token: string; expiresAt: number } | null = null;

  async function getToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      return cachedToken.token;
    }

    const tokenUrl = `${config.baseUrl}/dw/oauth2/access_token`;
    const response = await request(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
    });

    const body = await response.body.json() as SfccTokenResponse;
    cachedToken = {
      token: body.access_token,
      expiresAt: Date.now() + (body.expires_in - 60) * 1000,
    };

    return body.access_token;
  }

  function mapSfccOrder(sfccOrder: Record<string, unknown>): OrderStatusOutput {
    return {
      order_id: sfccOrder.order_no as string,
      status: mapSfccStatus(sfccOrder.status as string),
      status_label: mapSfccStatusLabel(sfccOrder.status as string),
      eta: (sfccOrder.shipments as Array<Record<string, unknown>>)?.[0]?.estimatedDelivery as string ?? null,
      tracking_number: (sfccOrder.shipments as Array<Record<string, unknown>>)?.[0]?.trackingNumber as string ?? null,
      carrier: (sfccOrder.shipments as Array<Record<string, unknown>>)?.[0]?.carrier as string ?? null,
      items: ((sfccOrder.product_items as Array<Record<string, unknown>>) ?? []).slice(0, 5).map((item) => ({
        sku: item.product_id as string,
        name: item.product_name as string,
        quantity: item.quantity as number,
      })),
      total: sfccOrder.order_total as string,
    };
  }

  return {
    async getOrderStatus(input: GetOrderStatusInput): Promise<GetOrderStatusResult> {
      const token = await getToken();

      const orderUrl = `${config.baseUrl}/dw/shop/v21_8/orders/${input.order_id}`;
      const response = await request(orderUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.statusCode === 404) {
        return { not_found: true } as const;
      }

      if (response.statusCode !== 200) {
        throw new Error(`SFCC returned status ${response.statusCode}`);
      }

      const body = await response.body.json() as Record<string, unknown>;
      return mapSfccOrder(body);
    },

    async searchProducts(_input: SearchProductsInput): Promise<SearchProductsResult> {
      // Stub: la integración real con SFCC OCAPI Products API queda como Fase 2.
      // Por ahora retorna vacío para que el flow no se rompa si alguien usa SFCC_MODE=real.
      return { products: [], total_matched: 0 };
    },
  };
}

function mapSfccStatus(sfccStatus: string): OrderStatusOutput['status'] {
  const map: Record<string, OrderStatusOutput['status']> = {
    created: 'procesando',
    new: 'procesando',
    open: 'procesando',
    completed: 'entregado',
    cancelled: 'cancelado',
    shipped: 'en_transito',
    delivered: 'entregado',
    replaced: 'devolucion',
  };
  return map[sfccStatus.toLowerCase()] ?? 'procesando';
}

function mapSfccStatusLabel(sfccStatus: string): string {
  const map: Record<string, string> = {
    created: 'Procesando',
    new: 'Procesando',
    open: 'Procesando',
    completed: 'Entregado',
    cancelled: 'Cancelado',
    shipped: 'En tránsito',
    delivered: 'Entregado',
    replaced: 'Devolución',
  };
  return map[sfccStatus.toLowerCase()] ?? 'Procesando';
}
