import type { Pool } from 'pg';

export interface TurnLogInput {
  turn_id: string;
  conversation_id: string;
  customer_id_hash?: string;
  brand: string;
  intent_classified?: string;
  tools_called: string[];
  latency_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  model_id?: string;
  output_text_redacted: string;
  sentiment_score?: number;
  guardrail_violations: string[];
  early_exit_reason?: string;
}

export interface PiiTokenMapInput {
  turn_id: string;
  token: string;
  value_hash: string;
  value_type: 'email' | 'phone' | 'order_id' | 'card' | 'cedula';
}

export function createTurnLogRepo(pool: Pool) {
  async function insert(data: TurnLogInput): Promise<void> {
    await pool.query(
      `INSERT INTO turn_log_audit
        (turn_id, conversation_id, customer_id_hash, brand, intent_classified,
         tools_called, latency_ms, tokens_in, tokens_out, model_id,
         output_text_redacted, sentiment_score, guardrail_violations, early_exit_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        data.turn_id,
        data.conversation_id,
        data.customer_id_hash ?? null,
        data.brand,
        data.intent_classified ?? null,
        data.tools_called,
        data.latency_ms ?? null,
        data.tokens_in ?? null,
        data.tokens_out ?? null,
        data.model_id ?? null,
        data.output_text_redacted,
        data.sentiment_score ?? null,
        data.guardrail_violations,
        data.early_exit_reason ?? null,
      ],
    );
  }

  async function insertPiiTokenMap(entries: PiiTokenMapInput[]): Promise<void> {
    if (entries.length === 0) return;

    const values = entries
      .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
      .join(', ');
    const params = entries.flatMap((e) => [e.turn_id, e.token, e.value_hash, e.value_type]);

    await pool.query(
      `INSERT INTO pii_token_map (turn_id, token, value_hash, value_type) VALUES ${values}`,
      params,
    );
  }

  return { insert, insertPiiTokenMap };
}

export type TurnLogRepo = ReturnType<typeof createTurnLogRepo>;
