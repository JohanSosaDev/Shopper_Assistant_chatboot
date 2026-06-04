import type { Pool } from 'pg';

export function createRetentionJob(pool: Pool) {
  const RETENTION_DAYS = 90;

  return {
    name: 'retention',
    schedule: '0 3 * * *',
    async execute(): Promise<{ purgedLogs: number; purgedTokens: number }> {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

      const tokenResult = await pool.query(
        `DELETE FROM pii_token_map
         WHERE turn_id IN (SELECT turn_id FROM turn_log_audit WHERE timestamp_iso < $1)`,
        [cutoff],
      );

      const logResult = await pool.query(
        'DELETE FROM turn_log_audit WHERE timestamp_iso < $1',
        [cutoff],
      );

      return {
        purgedLogs: logResult.rowCount ?? 0,
        purgedTokens: tokenResult.rowCount ?? 0,
      };
    },
  };
}
