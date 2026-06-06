import type { PipelineStep } from '../pipeline.js';
import type { ToolRegistry } from '../../../tools/tool-registry.js';

const ORDER_ID_PATTERN = /\b(PP|SS|OS|AT)-\d{4}-\d{4,6}\b/i;
const LOOSE_NUMBER_HINT = /\d{2,}/;

export function executeToolsStep(toolRegistry: ToolRegistry): PipelineStep {
  return async (ctx) => {
    if (ctx.intent === 'closing') return;

    if (ctx.intent === 'product_search') {
      const searchTool = toolRegistry.get('search_products');
      if (!searchTool) {
        ctx.earlyExitReason = 'tool_unavailable';
        ctx.finalResponse = 'No tengo acceso al catálogo en este momento.';
        return;
      }
      try {
        const result = await searchTool.execute({ query: ctx.input.message, limit: 3 });
        ctx.toolResults.push({ name: 'search_products', result });
      } catch {
        ctx.earlyExitReason = 'tool_unavailable';
        ctx.finalResponse = ctx.brandConfig?.neutral_fallback_text ?? 'Tuvimos un problema buscando en el catálogo. Intenta de nuevo.';
      }
      return;
    }

    if (ctx.intent === 'order_status_query') {
      const getOrderTool = toolRegistry.get('get_order_status');
      if (!getOrderTool) {
        ctx.earlyExitReason = 'tool_unavailable';
        ctx.finalResponse = ctx.brandConfig?.neutral_fallback_text ?? 'No puedo ayudarle con eso. ¿Hay algo más en lo que pueda apoyarle?';
        return;
      }

      // classify-intent garantiza que el match existe; uppercase porque fixtures usan PP-2026-NNNN.
      const orderIdMatch = ctx.input.message.match(ORDER_ID_PATTERN)!;
      const orderId = orderIdMatch[0].toUpperCase();

      try {
        const result = await getOrderTool.execute({ order_id: orderId, email: null });
        ctx.toolResults.push({ name: 'get_order_status', result });
      } catch {
        ctx.earlyExitReason = 'tool_unavailable';
        ctx.finalResponse = ctx.brandConfig?.neutral_fallback_text ?? 'Estamos teniendo un problema técnico. Intente en unos minutos.';
      }
      return;
    }

    if (ctx.intent === 'order_intent_no_id') {
      // Distinguir "mencionó número con formato malo" vs "no escribió número aún".
      if (LOOSE_NUMBER_HINT.test(ctx.input.message)) {
        ctx.finalResponse = 'El número de pedido no tiene el formato correcto. Debe ser PP-YYYY-NNNN (por ejemplo PP-2026-0001). ¿Podrías verificarlo?';
      } else {
        ctx.finalResponse = 'Claro, ¿me comparte el número de su pedido? El formato es PP-YYYY-NNNN (por ejemplo PP-2026-0001).';
      }
      return;
    }

    if (ctx.intent === 'product_intent_no_query') {
      ctx.finalResponse = '¡Con gusto! ¿Qué tipo de producto está buscando? Por ejemplo: camisas, jeans, vestidos, zapatos, bolsos…';
      return;
    }

    // intent === 'ambiguous' (default tras consent o saludos vagos).
    ctx.finalResponse = '¿En qué puedo ayudarle? Puedo consultar el estado de un pedido o ayudarle a buscar productos en nuestro catálogo.';
  };
}
