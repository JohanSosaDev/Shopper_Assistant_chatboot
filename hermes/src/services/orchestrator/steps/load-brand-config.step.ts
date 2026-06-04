import type { PipelineStep } from '../pipeline.js';
import type { BrandConfigService } from '../../brand-config.service.js';

export function loadBrandConfigStep(brandConfigService: BrandConfigService): PipelineStep {
  return async (ctx) => {
    ctx.brandConfig = await brandConfigService.getActive(ctx.input.brand);
  };
}
