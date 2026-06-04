import type { PipelineStep } from '../pipeline.js';
import type { ToolRegistry } from '../../../tools/tool-registry.js';

export function executeToolsStep(toolRegistry: ToolRegistry): PipelineStep {
  return async (ctx) => {
    const getOrderTool = toolRegistry.get('get_order_status');

    if (!getOrderTool) {
      ctx.earlyExitReason = 'tool_unavailable';
      ctx.finalResponse = ctx.brandConfig?.neutral_fallback_text ?? 'No puedo ayudarle con eso. ¿Hay algo más en lo que pueda apoyarle?';
      return;
    }

    const orderIdMatch = ctx.input.message.match(/\b(PP|SS|OS|AT)-\d{4}-\d{4,6}\b/);

    if (!orderIdMatch) {
      ctx.finalResponse = 'Por favor, indíqueme el número de su pedido para poder consultarlo.';
      return;
    }

    try {
      const result = await getOrderTool.execute({
        order_id: orderIdMatch[0],
        email: null,
      });

      ctx.toolResults.push({ name: 'get_order_status', result });
    } catch {
      ctx.earlyExitReason = 'tool_unavailable';
      ctx.finalResponse = ctx.brandConfig?.neutral_fallback_text ?? 'Estamos teniendo un problema técnico. Intente en unos minutos.';
    }
  };
}
