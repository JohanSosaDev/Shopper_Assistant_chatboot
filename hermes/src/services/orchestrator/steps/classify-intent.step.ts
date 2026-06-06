import type { PipelineStep } from '../pipeline.js';

// Despedida / cierre de conversación → farewell en generate-response.
const CLOSING_PATTERNS = /\b(no gracias|no,? gracias|gracias|estoy bien|ya está|ya esta|nada más|nada mas|listo|chao|adiós|adios|hasta luego|todo bien|ok gracias|perfecto|de nada|muchas gracias)\b/i;

// Order_id válido — el cliente ya escribió el número con formato canónico.
const ORDER_ID_PATTERN = /\b(PP|SS|OS|AT)-\d{4}-\d{4,6}\b/i;

// Categoría concreta del catálogo — el cliente sabe qué producto quiere.
const PRODUCT_CATEGORY_PATTERNS = /\b(camis(a|eta)s?|jeans?|pantal[oó]n(es)?|vestidos?|blusas?|chaquet?as?|polos?|zapatos?|tenis|abrigos?|buzos?|bolsos?|cintur[oó]n(es)?|prend[ao]s?|ropa|accesorios?|falda)\b/i;

// Quiere consultar un pedido pero no escribió el order_id.
const ORDER_KEYWORDS = /\b(pedido|orden|tracking|guía|guia|envío|envio|compra)\b/i;

// Quiere productos pero sin categoría concreta — vocabulario genérico.
const PRODUCT_GENERIC_KEYWORDS = /\b(productos?|cat[aá]logo|qué\s+venden|que\s+venden|qué\s+tienen|que\s+tienen)\b/i;

export function classifyIntentStep(): PipelineStep {
  return async (ctx) => {
    const text = ctx.input.message;

    if (CLOSING_PATTERNS.test(text)) {
      ctx.intent = 'closing';
      ctx.confidence = 0.9;
      return;
    }

    if (ORDER_ID_PATTERN.test(text)) {
      ctx.intent = 'order_status_query';
      ctx.confidence = 0.95;
      return;
    }

    if (PRODUCT_CATEGORY_PATTERNS.test(text)) {
      ctx.intent = 'product_search';
      ctx.confidence = 0.85;
      return;
    }

    if (ORDER_KEYWORDS.test(text)) {
      ctx.intent = 'order_intent_no_id';
      ctx.confidence = 0.7;
      return;
    }

    if (PRODUCT_GENERIC_KEYWORDS.test(text)) {
      ctx.intent = 'product_intent_no_query';
      ctx.confidence = 0.7;
      return;
    }

    ctx.intent = 'ambiguous';
    ctx.confidence = 0.3;
  };
}
