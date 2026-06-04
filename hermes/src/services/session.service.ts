import type { ConversationRepo } from '../repositories/conversation.repo.js';
import type { IdentityRequest, IdentityResult } from '../models/identity.js';
import type { ConversationId } from '../models/shared.js';
import { hashCustomerId } from '../lib/hashing.js';

export interface SessionService {
  resolveIdentity(request: IdentityRequest, piiSalt: string): Promise<IdentityResult>;
  getOrCreateConversation(
    brand: string,
    identityResult: IdentityResult,
    policyVersion: string,
  ): Promise<{ conversationId: ConversationId; isNew: boolean }>;
}

export function createSessionService(
  conversationRepo: ConversationRepo,
): SessionService {
  return {
    async resolveIdentity(request, piiSalt) {
      if (request.session_token) {
        return {
          customer_id_hash: hashCustomerId(request.session_token, piiSalt),
          customer_profile: null,
          auth_method: 'sfcc_session',
          verified_against_order: null,
        };
      }

      if (request.guest_proof) {
        const customerId = `${request.guest_proof.order_id}:${request.guest_proof.email}`;
        return {
          customer_id_hash: hashCustomerId(customerId, piiSalt),
          customer_profile: null,
          auth_method: 'guest_matched',
          verified_against_order: request.guest_proof.order_id,
        };
      }

      return {
        customer_id_hash: null,
        customer_profile: null,
        auth_method: 'guest_unauth',
        verified_against_order: null,
      };
    },

    async getOrCreateConversation(brand, identityResult, policyVersion) {
      const conv = await conversationRepo.create({
        brand: brand as any,
        auth_method: identityResult.auth_method,
        policy_version: policyVersion,
        customer_id_hash: identityResult.customer_id_hash ?? undefined,
      });

      return {
        conversationId: conv.conversation_id as unknown as ConversationId,
        isNew: true,
      };
    },
  };
}
