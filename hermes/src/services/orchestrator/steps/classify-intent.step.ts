import type { PipelineStep } from '../pipeline.js';

// Patrones de cierre / despedida. Si matchea, respondemos con farewell en generate-response.
const CLOSING_PATTERNS = /\b(no gracias|no,? gracias|gracias|estoy bien|ya está|ya esta|nada más|nada mas|listo|chao|adiós|adios|hasta luego|todo bien|ok gracias|perfecto|de nada|muchas gracias)\b/i;

// Patrones de búsqueda de productos: si menciona categoría/prenda/concepto del catálogo
// y NO contiene un order_id válido, asumimos product_search.
const PRODUCT_PATTERNS = /\b(camis(a|eta)s?|jeans?|pantal[oó]n(es)?|vestidos?|blusas?|chaquet?as?|polos?|zapatos?|tenis|abrigos?|buzos?|bolsos?|cintur[oó]n(es)?|prend[ao]s?|ropa|accesorios?|falda)\b/i;
const ORDER_ID_PATTERN = /\b(PP|SS|OS|AT)-\d{4}-\d{4,6}\b/i;

export function classifyIntentStep(): PipelineStep {
  return async (ctx) => {
    const text = ctx.input.message;

    if (CLOSING_PATTERNS.test(text)) {
      ctx.intent = 'closing';
      ctx.confidence = 0.9;
      return;
    }

    // Product search: menciona categoría/prenda y no hay order_id en el mensaje
    if (PRODUCT_PATTERNS.test(text) && !ORDER_ID_PATTERN.test(text)) {
      ctx.intent = 'product_search';
      ctx.confidence = 0.85;
      return;
    }

    ctx.intent = 'order_status_query';
    ctx.confidence = 0.95;
  };
}
