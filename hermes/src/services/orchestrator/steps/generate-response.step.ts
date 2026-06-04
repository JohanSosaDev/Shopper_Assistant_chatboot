import type { PipelineStep } from '../pipeline.js';

export function generateResponseStep(): PipelineStep {
  return async (ctx) => {
    if (ctx.finalResponse) {
      return;
    }

    if (ctx.toolResults.length > 0) {
      const toolResult = ctx.toolResults[0]!.result as Record<string, unknown>;

      if (toolResult.not_found === true) {
        ctx.finalResponse = 'No encuentro un pedido con esos datos. ¿Podría verificar el número de pedido e intentar de nuevo?';
        return;
      }

      const order = toolResult as {
        order_id: string;
        status_label: string;
        eta: string | null;
        tracking_number: string | null;
        carrier: string | null;
        items: Array<{ sku: string; name: string; quantity: number }>;
        total: string;
      };

      let response = `Su pedido ${order.order_id} está ${order.status_label.toLowerCase()}.`;

      if (order.eta) {
        response += ` La fecha estimada de entrega es el ${order.eta}.`;
      }

      if (order.tracking_number && order.carrier) {
        response += ` El número de guía es ${order.tracking_number} con la transportadora ${order.carrier}.`;
      }

      if (order.items && order.items.length > 0) {
        const itemsText = order.items
          .map((i) => `${i.quantity} ${i.name}`)
          .join(', ');
        response += ` Incluye: ${itemsText}.`;
      }

      response += ' ¿Hay algo más en que pueda ayudarle?';

      ctx.finalResponse = response;
      return;
    }

    ctx.finalResponse = ctx.brandConfig?.neutral_fallback_text ?? '¿En qué puedo ayudarle hoy?';
  };
}
