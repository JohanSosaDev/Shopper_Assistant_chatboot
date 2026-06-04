import type { Pool, QueryResultRow } from 'pg';
import type { ConversationId } from '../models/shared.js';
import type { BrandId } from '../models/shared.js';

export interface ConversationRow {
  conversation_id: string;
  brand: BrandId;
  customer_id_hash: string | null;
  auth_method: 'sfcc_session' | 'guest_matched' | 'guest_unauth';
  status: 'awaiting_consent' | 'active' | 'closed' | 'consent_denied';
  started_at: Date;
  last_activity_at: Date;
  closed_at: Date | null;
  close_reason: 'ttl_inactivity' | 'consent_denied' | 'client_explicit_close' | null;
  policy_version: string;
}

export interface TurnRow {
  turn_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  intent: string | null;
  confidence: number | null;
  timestamp: Date;
  latency_ms: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  model_id: string | null;
  early_exit_reason: string | null;
}

export function createConversationRepo(pool: Pool) {
  async function findById(id: ConversationId): Promise<ConversationRow | null> {
    const result = await pool.query<ConversationRow>(
      'SELECT * FROM conversations WHERE conversation_id = $1',
      [id],
    );
    return (result.rows[0] as ConversationRow | undefined) ?? null;
  }

  async function create(data: {
    brand: BrandId;
    auth_method: 'sfcc_session' | 'guest_matched' | 'guest_unauth';
    policy_version: string;
    customer_id_hash?: string;
  }): Promise<ConversationRow> {
    const result = await pool.query<ConversationRow>(
      `INSERT INTO conversations (brand, auth_method, status, policy_version, customer_id_hash)
       VALUES ($1, $2, 'awaiting_consent', $3, $4)
       RETURNING *`,
      [data.brand, data.auth_method, data.policy_version, data.customer_id_hash ?? null],
    );
    return result.rows[0] as ConversationRow;
  }

  async function updateStatus(
    id: ConversationId,
    status: ConversationRow['status'],
    closeReason?: ConversationRow['close_reason'],
  ): Promise<void> {
    if (status === 'closed') {
      await pool.query(
        `UPDATE conversations
         SET status = $1, closed_at = NOW(), close_reason = $2, last_activity_at = NOW()
         WHERE conversation_id = $3`,
        [status, closeReason, id],
      );
    } else {
      await pool.query(
        `UPDATE conversations
         SET status = $1, last_activity_at = NOW()
         WHERE conversation_id = $2`,
        [status, id],
      );
    }
  }

  async function touch(id: ConversationId): Promise<void> {
    await pool.query(
      'UPDATE conversations SET last_activity_at = NOW() WHERE conversation_id = $1',
      [id],
    );
  }

  async function closeStale(olderThan: Date): Promise<number> {
    const result = await pool.query<QueryResultRow>(
      `UPDATE conversations
       SET status = 'closed', closed_at = NOW(), close_reason = 'ttl_inactivity'
       WHERE status IN ('awaiting_consent', 'active')
         AND last_activity_at < $1
       RETURNING conversation_id`,
      [olderThan],
    );
    return result.rowCount ?? 0;
  }

  async function insertTurn(data: {
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    intent?: string;
    confidence?: number;
    latency_ms?: number;
    tokens_in?: number;
    tokens_out?: number;
    model_id?: string;
    early_exit_reason?: string;
  }): Promise<TurnRow> {
    const result = await pool.query<TurnRow>(
      `INSERT INTO turns
        (conversation_id, role, text, intent, confidence, latency_ms, tokens_in, tokens_out, model_id, early_exit_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.conversation_id,
        data.role,
        data.text,
        data.intent ?? null,
        data.confidence ?? null,
        data.latency_ms ?? null,
        data.tokens_in ?? null,
        data.tokens_out ?? null,
        data.model_id ?? null,
        data.early_exit_reason ?? null,
      ],
    );
    return result.rows[0] as TurnRow;
  }

  async function getTurns(
    conversationId: ConversationId,
    limit: number = 10,
  ): Promise<TurnRow[]> {
    const result = await pool.query<TurnRow>(
      `SELECT * FROM turns
       WHERE conversation_id = $1
       ORDER BY timestamp ASC
       LIMIT $2`,
      [conversationId, limit],
    );
    return result.rows;
  }

  return {
    findById,
    create,
    updateStatus,
    touch,
    closeStale,
    insertTurn,
    getTurns,
  };
}

export type ConversationRepo = ReturnType<typeof createConversationRepo>;
