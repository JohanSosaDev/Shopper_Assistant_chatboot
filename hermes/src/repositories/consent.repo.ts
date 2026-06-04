import type { Pool } from 'pg';

export interface ConsentLogRow {
  consent_id: string;
  conversation_id: string;
  granted: boolean;
  timestamp: Date;
  policy_version: string;
  client_text: string;
}

export function createConsentRepo(pool: Pool) {
  async function insert(data: {
    conversation_id: string;
    granted: boolean;
    policy_version: string;
    client_text: string;
  }): Promise<ConsentLogRow> {
    const result = await pool.query<ConsentLogRow>(
      `INSERT INTO consent_log (conversation_id, granted, policy_version, client_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.conversation_id, data.granted, data.policy_version, data.client_text],
    );
    return result.rows[0] as ConsentLogRow;
  }

  async function getLatest(conversationId: string): Promise<ConsentLogRow | null> {
    const result = await pool.query<ConsentLogRow>(
      `SELECT * FROM consent_log
       WHERE conversation_id = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [conversationId],
    );
    return result.rows[0] ?? null;
  }

  async function hasGranted(conversationId: string): Promise<boolean> {
    const result = await pool.query<{ granted: boolean }>(
      `SELECT granted FROM consent_log
       WHERE conversation_id = $1 AND granted = true
       ORDER BY timestamp DESC
       LIMIT 1`,
      [conversationId],
    );
    return result.rows.length > 0;
  }

  return { insert, getLatest, hasGranted };
}

export type ConsentRepo = ReturnType<typeof createConsentRepo>;
