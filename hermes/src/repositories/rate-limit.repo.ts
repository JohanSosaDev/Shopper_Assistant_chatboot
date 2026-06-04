import type { Pool } from 'pg';

export function createRateLimitRepo(pool: Pool) {
  async function increment(
    bucketKey: string,
    ttlMs: number,
    max: number,
  ): Promise<{ current: number; allowed: boolean }> {
    const expiresAt = new Date(Date.now() + ttlMs);

    const result = await pool.query<{ current: number }>(
      `INSERT INTO rate_limit_buckets (bucket_key, current, ttl_ms, expires_at)
       VALUES ($1, 1, $2, $3)
       ON CONFLICT (bucket_key) DO UPDATE
         SET current = rate_limit_buckets.current + 1,
             updated_at = NOW()
         WHERE rate_limit_buckets.expires_at > NOW()
       RETURNING current`,
      [bucketKey, ttlMs, expiresAt],
    );

    if (result.rows.length === 0) {
      await pool.query(
        `UPDATE rate_limit_buckets
         SET current = 1, expires_at = $2, updated_at = NOW()
         WHERE bucket_key = $1`,
        [bucketKey, expiresAt],
      );
      return { current: 1, allowed: true };
    }

    const current = result.rows[0]!.current;
    return { current, allowed: current <= max };
  }

  async function getCurrent(bucketKey: string): Promise<number> {
    const result = await pool.query<{ current: number }>(
      `SELECT current FROM rate_limit_buckets
       WHERE bucket_key = $1 AND expires_at > NOW()`,
      [bucketKey],
    );
    return result.rows[0]?.current ?? 0;
  }

  async function cleanupExpired(): Promise<number> {
    const result = await pool.query(
      'DELETE FROM rate_limit_buckets WHERE expires_at <= NOW()',
    );
    return result.rowCount ?? 0;
  }

  return { increment, getCurrent, cleanupExpired };
}

export type RateLimitRepo = ReturnType<typeof createRateLimitRepo>;
