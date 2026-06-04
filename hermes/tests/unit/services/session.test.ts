import { describe, it, expect, vi } from 'vitest';
import { createSessionService } from '../../../src/services/session.service.js';
import type { ConversationRepo } from '../../../src/repositories/conversation.repo.js';
import type { IdentityRequest } from '../../../src/models/identity.js';

describe('SessionService', () => {
  function mockRepo(): ConversationRepo {
    return {
      create: vi.fn().mockResolvedValue({ conversation_id: '550e8400-e29b-41d4-a716-446655440000', id: 1 }),
      findById: vi.fn(),
      findByCustomerHash: vi.fn(),
      findByBrandAndCustomerHash: vi.fn(),
      findStaleOlderThan: vi.fn(),
      deleteOlderThan: vi.fn(),
      deleteById: vi.fn(),
      deleteByBrandOlderThan: vi.fn(),
    };
  }

  it('resolves session_token to customer hash', async () => {
    const svc = createSessionService(mockRepo());
    const req: IdentityRequest = { session_token: 'tok-abc' };
    const result = await svc.resolveIdentity(req, 'salt');
    expect(result.auth_method).toBe('sfcc_session');
    expect(result.customer_id_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.customer_profile).toBeNull();
  });

  it('resolves guest_proof to customer hash', async () => {
    const svc = createSessionService(mockRepo());
    const req: IdentityRequest = { guest_proof: { order_id: 'PP-2024-123456', email: 'user@example.com' } };
    const result = await svc.resolveIdentity(req, 'salt');
    expect(result.auth_method).toBe('guest_matched');
    expect(result.customer_id_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.verified_against_order).toBe('PP-2024-123456');
  });

  it('returns unauth for anonymous', async () => {
    const svc = createSessionService(mockRepo());
    const req: IdentityRequest = {};
    const result = await svc.resolveIdentity(req, 'salt');
    expect(result.auth_method).toBe('guest_unauth');
    expect(result.customer_id_hash).toBeNull();
  });
});
