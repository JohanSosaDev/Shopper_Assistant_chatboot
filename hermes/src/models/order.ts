// order.ts
// Schemas del tool get_order_status (M3 SFCC Integrations).
// El tool result va al LLM como part del tool_use response, así que el shape
// importa para que el LLM lo entienda y refleje correctamente al cliente
// (con grounding R-GUARD-OUT-1).

import { z } from 'zod';

// ===========================================================================
// Tool input
// ===========================================================================

export const GetOrderStatusInputSchema = z.object({
  /** Formato `(PP|SS|OS|AT)-YYYY-NNNN(NN)` per R-PII-1. */
  order_id: z
    .string()
    .regex(
      /^(PP|SS|OS|AT)-\d{4}-\d{4,6}$/,
      'order_id debe matchear PP-YYYY-NNNN (o SS/OS/AT prefijo)',
    ),
  /** Email proporcionado para verificación guest. Opcional si la sesión SFCC ya autenticó. */
  email: z.string().email().nullable().optional(),
});

export type GetOrderStatusInput = z.infer<typeof GetOrderStatusInputSchema>;

// ===========================================================================
// Tool output (lo que SFCC retorna y se pasa al LLM)
// ===========================================================================

export const OrderStatusEnumSchema = z.enum([
  'procesando',
  'preparando',
  'en_transito',
  'en_reparto',
  'entregado',
  'devolucion',
  'cancelado',
]);

export type OrderStatus = z.infer<typeof OrderStatusEnumSchema>;

export const OrderItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderStatusOutputSchema = z.object({
  order_id: z.string(),
  status: OrderStatusEnumSchema,
  /** Texto user-facing en español, generado por SFCC adapter para coherencia. */
  status_label: z.string(),
  /** Fecha estimada de entrega en formato YYYY-MM-DD. Null si no aplica (entregado/cancelado). */
  eta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'eta debe ser ISO date YYYY-MM-DD')
    .nullable(),
  /** Tracking number del carrier. Null si aún no asignado. */
  tracking_number: z.string().nullable(),
  /** Carrier name (TCC, Servientrega, etc.). Null si no aplica. */
  carrier: z.string().nullable(),
  /** Items en la orden. Truncado a 5 items para no inflar el contexto del LLM. */
  items: z.array(OrderItemSchema).max(5),
  /** Total formateado como string ('$ 159.900'). */
  total: z.string(),
});

export type OrderStatusOutput = z.infer<typeof OrderStatusOutputSchema>;

// ===========================================================================
// Error result (para fallback Plan B y modo mock)
// ===========================================================================

export const OrderNotFoundSchema = z.object({
  /** Marker que el LLM puede checkear sin exponer información de existencia (R-ID-2 anti-enumeration). */
  not_found: z.literal(true),
});

export type OrderNotFound = z.infer<typeof OrderNotFoundSchema>;

/**
 * Result type del tool: éxito con datos o not-found anti-enumeration.
 * NUNCA exponer info adicional cuando no se encuentra (R-ID-2).
 */
export const GetOrderStatusResultSchema = z.union([OrderStatusOutputSchema, OrderNotFoundSchema]);

export type GetOrderStatusResult = z.infer<typeof GetOrderStatusResultSchema>;
