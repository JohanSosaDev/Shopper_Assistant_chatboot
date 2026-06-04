// identity.ts
// M4 Identity & Session — input/output del ISessionService.resolveIdentity.
// domain-entities.md §6 (CustomerIdentity es derivada, no persistida).

import { z } from 'zod';
import { AuthMethodSchema } from './conversation.js';
import { BrandIdSchema, CustomerIdHashSchema } from './shared.js';

// ===========================================================================
// Request al servicio de identidad
// ===========================================================================

export const IdentityRequestSchema = z.object({
  brand: BrandIdSchema,
  /** Token de sesión SFCC si el cliente ya está logueado en la storefront. */
  session_token: z.string().nullable().optional(),
  /** Cookie de sesión guest (UUID generado client-side). */
  session_id: z.string().min(1).nullable().optional(),
  /** Si el flujo guest-friendly tiene orderId + email del cliente, vienen aquí. */
  guest_proof: z
    .object({
      order_id: z.string().regex(/^(PP|SS|OS|AT)-\d{4}-\d{4,6}$/),
      email: z.string().email(),
    })
    .nullable()
    .optional(),
});

export type IdentityRequest = z.infer<typeof IdentityRequestSchema>;

// ===========================================================================
// Customer profile (transient — solo en memoria del request)
// ===========================================================================
// NUNCA persistir cleartext. Se reconstruye desde SFCC en cada turno que lo
// necesite (R-PII-3 mantiene el invariante).

export const CustomerProfileSchema = z.object({
  /** First name solamente. Apellido NO se persiste. */
  first_name: z.string().min(1).max(100),
  /** Cualquier label que SFCC retorne. Solo en memoria del turno. */
  loyalty_tier: z.string().nullable().optional(),
});

export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;

// ===========================================================================
// Result del servicio de identidad
// ===========================================================================

export const IdentityResultSchema = z
  .object({
    /** Hash sha256(sfcc_customer_id + salt). Nullable cuando guest_unauth. */
    customer_id_hash: CustomerIdHashSchema.nullable(),
    /** Profile transient en memoria. NUNCA se persiste. */
    customer_profile: CustomerProfileSchema.nullable(),
    auth_method: AuthMethodSchema,
    /** orderId usado para verificar guest_matched, si aplica. */
    verified_against_order: z.string().nullable(),
  })
  .refine(
    (r) => {
      // guest_matched ⟹ verified_against_order debe estar presente
      if (r.auth_method === 'guest_matched') {
        return r.verified_against_order !== null;
      }
      return true;
    },
    { message: 'guest_matched requires verified_against_order' },
  );

export type IdentityResult = z.infer<typeof IdentityResultSchema>;
