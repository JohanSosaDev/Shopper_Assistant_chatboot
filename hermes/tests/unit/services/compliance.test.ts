import { describe, it, expect, vi } from 'vitest';
import { createComplianceService } from '../../../src/services/compliance.service.js';
import type { ConsentRepo } from '../../../src/repositories/consent.repo.js';

describe('ComplianceService', () => {
  function mockRepo(): ConsentRepo {
    return {
      insert: vi.fn(),
      hasGranted: vi.fn().mockResolvedValue(false),
      deleteOlderThan: vi.fn(),
    };
  }

  describe('evaluateConsent', () => {
    const svc = createComplianceService(mockRepo());

    it('returns granted for sí', () => {
      expect(svc.evaluateConsent('sí').granted).toBe(true);
    });

    it('returns granted for si (no accent)', () => {
      expect(svc.evaluateConsent('si').granted).toBe(true);
    });

    it('returns granted for acepto', () => {
      expect(svc.evaluateConsent('acepto').granted).toBe(true);
    });

    it('returns granted for ok', () => {
      expect(svc.evaluateConsent('ok').granted).toBe(true);
    });

    it('returns not granted for no', () => {
      const result = svc.evaluateConsent('no');
      expect(result.granted).toBe(false);
      expect(result.ambiguous).toBe(false);
    });

    it('returns ambiguous for unrelated text', () => {
      const result = svc.evaluateConsent('cuál es el estado de mi pedido');
      expect(result.granted).toBe(false);
      expect(result.ambiguous).toBe(true);
    });
  });

  describe('captureConsent', () => {
    it('persists via repo', async () => {
      const repo = mockRepo();
      const svc = createComplianceService(repo);
      const brandConfig = { policy_version: 'v1' } as any;
      await svc.captureConsent('conv-1', { granted: true, ambiguous: false, reason: null }, brandConfig);
      expect(repo.insert).toHaveBeenCalledWith(expect.objectContaining({
        conversation_id: 'conv-1',
        granted: true,
        policy_version: 'v1',
      }));
    });
  });

  describe('anonymize', () => {
    it('delegates to pii-anonymizer', () => {
      const svc = createComplianceService(mockRepo());
      const result = svc.anonymize('user@example.com', 'salt');
      expect(result.text).toContain('<EMAIL_1>');
      expect(result.tokens).toHaveLength(1);
    });
  });
});
