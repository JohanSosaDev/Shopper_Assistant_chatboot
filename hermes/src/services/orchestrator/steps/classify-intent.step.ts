import type { PipelineStep } from '../pipeline.js';

// Patrones de cierre / despedida. Si el mensaje matchea, no llamamos el tool
// y respondemos con un farewell cordial en generate-response.
const CLOSING_PATTERNS = /\b(no gracias|no,? gracias|gracias|estoy bien|ya está|ya esta|nada más|nada mas|listo|chao|adiós|adios|hasta luego|todo bien|ok gracias|perfecto|de nada|muchas gracias)\b/i;

export function classifyIntentStep(): PipelineStep {
  return async (ctx) => {
    if (CLOSING_PATTERNS.test(ctx.input.message)) {
      ctx.intent = 'closing';
      ctx.confidence = 0.9;
      return;
    }
    ctx.intent = 'order_status_query';
    ctx.confidence = 0.95;
  };
}
