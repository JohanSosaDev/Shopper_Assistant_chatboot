import type { BrandConfigRepo } from '../repositories/brand-config.repo.js';
import type { BrandConfig } from '../models/brand-config.js';
import type { BrandId, PolicyVersion } from '../models/shared.js';
import { SYSTEM_PROMPT } from '../prompts/patprimo/system.prompt.js';
import { FEW_SHOT_EXAMPLES } from '../prompts/patprimo/few-shot.js';
import { PATPRIMO_TEXTS } from '../prompts/patprimo/texts.js';
import { ConfigError } from '../models/errors.js';

export interface BrandConfigService {
  getActive(brand: BrandId): Promise<BrandConfig>;
}

function buildFewShotFromPairs(): Array<{ user_message: string; assistant_response: string }> {
  const result: Array<{ user_message: string; assistant_response: string }> = [];
  for (let i = 0; i < FEW_SHOT_EXAMPLES.length - 1; i += 2) {
    const user = FEW_SHOT_EXAMPLES[i]!;
    const assistant = FEW_SHOT_EXAMPLES[i + 1]!;
    if (user.role === 'user' && assistant.role === 'assistant') {
      result.push({ user_message: user.content, assistant_response: assistant.content });
    }
  }
  return result;
}

export function createBrandConfigService(repo: BrandConfigRepo): BrandConfigService {
  return {
    async getActive(brand: BrandId): Promise<BrandConfig> {
      const row = await repo.findByBrand(brand);

      if (!row) {
        throw new ConfigError(`Brand config not found for ${brand}`);
      }

      return {
        brand: row.brand as BrandId,
        version_id: row.version_id,
        system_prompt: SYSTEM_PROMPT,
        few_shot_examples: buildFewShotFromPairs(),
        customer_facing_name: row.customer_facing_name,
        tone: row.tone as 'formal_close' | 'casual' | 'formal',
        language: row.language,
        consent_request_text: PATPRIMO_TEXTS.consentRequestText,
        consent_denied_text: PATPRIMO_TEXTS.consentDeniedText,
        neutral_fallback_text: PATPRIMO_TEXTS.neutralFallbackText,
        policy_version: row.policy_version as PolicyVersion,
      };
    },
  };
}
