import type { PipelineStep } from '../pipeline.js';
import type { ToolRegistry } from '../../../tools/tool-registry.js';

export function executeToolsStep(toolRegistry: ToolRegistry): PipelineStep {
  return async (ctx) => {
    // Si el intent es closing (despedida), no llamamos ningún tool.
    if (ctx.intent === 'closing') return;

    const getOrderTool = toolRegistry.get('get_order_status');

    if (!getOrderTool) {
      ctx.earlyExitReason = 'tool_unavailable';
      ctx.finalResponse = ctx.brandConfig?.neutral_fallback_text ?? 'No puedo ayudarle con eso. ¿Hay algo más en lo que pueda apoyarle?';
      return;
    }

    const orderIdMatch = ctx.input.message.match(/\b(PP|SS|OS|AT)-\d{4}-\d{4,6}\b/i);

    if (!orderIdMatch) {
      // Si el cliente menciona "pedido/orden/tracking/guía" pero el formato es inválido,
      // dar pista del formato correcto en vez del fallback genérico.
      const ORDER_KEYWORDS = /\b(pedido|orden|tracking|guía|guia|envío|envio|compra)\b/i;
      if (ORDER_KEYWORDS.test(ctx.input.message)) {
        ctx.finalResponse = 'No encuentro un pedido con ese número. El formato debe ser PP-YYYY-NNNN (por ejemplo PP-2026-0001). ¿Podrías verificarlo?';
      } else {
        ctx.finalResponse = 'Por favor, indíqueme el número de su pedido para poder consultarlo.';
      }
      return;
    }

    // Normalizar a uppercase porque las fixtures usan PP-2026-NNNN en mayúsculas
    // y el regex `i` flag puede haber matcheado en minúsculas.
    const orderId = orderIdMatch[0].toUpperCase();

    try {
      const result = await getOrderTool.execute({
        order_id: orderId,
        email: null,
      });

      ctx.toolResults.push({ name: 'get_order_status', result });
    } catch {
      ctx.earlyExitReason = 'tool_unavailable';
      ctx.finalResponse = ctx.brandConfig?.neutral_fallback_text ?? 'Estamos teniendo un problema técnico. Intente en unos minutos.';
    }
  };
}
