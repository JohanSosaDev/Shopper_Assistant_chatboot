import { describe, it, expect, vi } from 'vitest';
import { createLoggerService } from '../../../src/services/logger.service.js';
import type { TurnLogRepo } from '../../../src/repositories/turn-log.repo.js';
import type { TurnLogInput } from '../../../src/models/turn-log.js';

describe('LoggerService', () => {
  function mockRepo(): TurnLogRepo {
    return {
      insert: vi.fn(),
      insertPiiTokenMap: vi.fn(),
      deleteOlderThan: vi.fn(),
    };
  }

  it('inserts turn log without PII tokens', async () => {
    const repo = mockRepo();
    const svc = createLoggerService(repo);
    const input: TurnLogInput = {
      turn_id: '550e8400-e29b-41d4-a716-446655440000',
      conversation_id: '550e8400-e29b-41d4-a716-446655440001',
      brand: 'patprimo',
      tools_called: [],
      output_text_redacted: 'Hola',
      guardrail_violations: [],
    };
    await svc.logTurn(input);
    expect(repo.insert).toHaveBeenCalledTimes(1);
    expect(repo.insertPiiTokenMap).not.toHaveBeenCalled();
  });

  it('inserts PII token map when tokens provided', async () => {
    const repo = mockRepo();
    const svc = createLoggerService(repo);
    const input: TurnLogInput = {
      turn_id: '550e8400-e29b-41d4-a716-446655440000',
      conversation_id: '550e8400-e29b-41d4-a716-446655440001',
      brand: 'patprimo',
      tools_called: [],
      output_text_redacted: '<EMAIL_1>',
      guardrail_violations: [],
    };
    await svc.logTurn(input, [
      { original: 'user@example.com', token: '<EMAIL_1>', hash: 'abc123' },
    ]);
    expect(repo.insertPiiTokenMap).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          turn_id: input.turn_id,
          token: '<EMAIL_1>',
          value_hash: 'abc123',
          value_type: 'email',
        }),
      ]),
    );
  });
});
