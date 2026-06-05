import type { PipelineStep } from '../pipeline.js';

export function generateResponseStep(): PipelineStep {
  return async (ctx) => {
    if (ctx.finalResponse) {
      return;
    }

    // Despedida cordial cuando el cliente cierra la conversación.
    if (ctx.intent === 'closing') {
      ctx.finalResponse = 'Perfecto, estoy a la orden si necesita otra consulta. ¡Que tenga un excelente día!';
      return;
    }

    // Respuesta de product search: formatear los productos encontrados.
    if (ctx.intent === 'product_search') {
      const toolResult = ctx.toolResults[0]?.result as
        | {
            products: Array<{
              name: string;
              price: string;
              colors: string[];
              sizes: string[];
              sku: string;
              category: string;
            }>;
            total_matched: number;
          }
        | undefined;

      if (!toolResult || toolResult.products.length === 0) {
        ctx.finalResponse =
          'No encontré productos que coincidan con tu búsqueda. ¿Podrías ser más específico? Por ejemplo: "busco una camisa azul" o "tienen tenis para mujer".';
        return;
      }

      const plural = toolResult.products.length > 1;
      const lines = [
        `Encontré ${toolResult.products.length} producto${plural ? 's' : ''} que podría${plural ? 'n' : ''} interesarte:`,
        '',
      ];

      toolResult.products.forEach((p, i) => {
        lines.push(`${i + 1}. ${p.name} — ${p.price}`);
        lines.push(`   Colores: ${p.colors.join(', ')} · Tallas: ${p.sizes.join(', ')}`);
        lines.push(`   SKU: ${p.sku}`);
        lines.push('');
      });

      if (toolResult.total_matched > toolResult.products.length) {
        lines.push(`(Hay ${toolResult.total_matched - toolResult.products.length} más en el catálogo)`);
      }

      lines.push('¿Te interesa alguno o quieres ver otra cosa?');

      ctx.finalResponse = lines.join('\n');
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
