import { describe, it, expect } from 'vitest';
import { checkOutputGuardrails } from '../../../src/guardrails/output.guards.js';

describe('checkOutputGuardrails', () => {
  it('allows normal response', () => {
    const result = checkOutputGuardrails('Su pedido PP-2024-123456 está en camino.');
    expect(result.blocked).toBe(false);
  });

  it('detects system prompt leak', () => {
    const result = checkOutputGuardrails('Según IDENTIDAD Y TONO, debo responder...');
    expect(result.blocked).toBe(true);
    expect(result.violations[0].category).toBe('system_prompt_leak');
  });

  it('detects discount promise', () => {
    const result = checkOutputGuardrails('Le ofrezco un descuento del 20%');
    expect(result.blocked).toBe(true);
    expect(result.violations[0].category).toBe('discount_promise');
  });

  it('detects competitor mention', () => {
    const result = checkOutputGuardrails('Puede comprar en Falabella');
    expect(result.blocked).toBe(true);
    expect(result.violations[0].category).toBe('competitor_mention');
  });

  it('detects grounding failure when order_id not in output', () => {
    const result = checkOutputGuardrails(
      'Su pedido está en camino.',
      { order_id: 'PP-2024-123456' },
    );
    expect(result.blocked).toBe(true);
    expect(result.violations[0].category).toBe('grounding_order_id');
  });

  it('passes grounding when order_id is in output', () => {
    const result = checkOutputGuardrails(
      'Su pedido PP-2024-123456 está en camino.',
      { order_id: 'PP-2024-123456' },
    );
    expect(result.blocked).toBe(false);
  });
});
