import type { TurnLogRepo, TurnLogInput as RepoTurnLogInput } from '../repositories/turn-log.repo.js';
import type { TurnLogInput } from '../models/turn-log.js';
import type { PiiToken } from '../lib/pii-anonymizer.js';

export interface LoggerService {
  logTurn(input: TurnLogInput, piiTokens?: PiiToken[]): Promise<void>;
}

export function createLoggerService(turnLogRepo: TurnLogRepo): LoggerService {
  return {
    async logTurn(input, piiTokens) {
      const repoInput: RepoTurnLogInput = {
        turn_id: input.turn_id,
        conversation_id: input.conversation_id,
        customer_id_hash: input.customer_id_hash ?? undefined,
        brand: input.brand,
        intent_classified: input.intent_classified ?? undefined,
        tools_called: input.tools_called,
        latency_ms: input.latency_ms ?? undefined,
        tokens_in: input.tokens_in ?? undefined,
        tokens_out: input.tokens_out ?? undefined,
        model_id: input.model_id ?? undefined,
        output_text_redacted: input.output_text_redacted,
        sentiment_score: input.sentiment_score ?? undefined,
        guardrail_violations: input.guardrail_violations,
        early_exit_reason: input.early_exit_reason ?? undefined,
      };

      await turnLogRepo.insert(repoInput);

      if (piiTokens && piiTokens.length > 0) {
        await turnLogRepo.insertPiiTokenMap(
          piiTokens.map((t) => ({
            turn_id: input.turn_id,
            token: t.token,
            value_hash: t.hash,
            value_type: mapTokenType(t.token),
          })),
        );
      }
    },
  };
}

function mapTokenType(token: string): 'email' | 'phone' | 'order_id' | 'card' | 'cedula' {
  if (token.startsWith('<EMAIL_')) return 'email';
  if (token.startsWith('<PHONE_')) return 'phone';
  if (token.startsWith('<ORDER_')) return 'order_id';
  if (token.startsWith('<CARD_')) return 'card';
  return 'cedula';
}
