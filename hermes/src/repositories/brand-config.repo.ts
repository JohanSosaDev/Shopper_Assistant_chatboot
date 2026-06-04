import type { Pool } from 'pg';
import type { BrandId } from '../models/shared.js';

export interface BrandConfigRow {
  brand: string;
  version_id: string;
  system_prompt: string;
  few_shot_examples: unknown[];
  customer_facing_name: string;
  tone: string;
  language: string;
  consent_request_text: string;
  consent_denied_text: string;
  neutral_fallback_text: string;
  policy_version: string;
}

export function createBrandConfigRepo(pool: Pool) {
  async function findByBrand(brand: BrandId): Promise<BrandConfigRow | null> {
    const result = await pool.query<BrandConfigRow>(
      'SELECT * FROM brand_configs WHERE brand = $1',
      [brand],
    );
    return result.rows[0] ?? null;
  }

  return { findByBrand };
}

export type BrandConfigRepo = ReturnType<typeof createBrandConfigRepo>;
