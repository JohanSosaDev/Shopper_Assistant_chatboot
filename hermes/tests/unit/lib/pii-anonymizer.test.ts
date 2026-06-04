import { describe, it, expect } from 'vitest';
import { anonymizePII } from '../../../src/lib/pii-anonymizer.js';

const SALT = 'test-pii-salt';

describe('anonymizePII', () => {
  it('replaces email with token', () => {
    const result = anonymizePII('mi correo es user@example.com', SALT);
    expect(result.text).toContain('<EMAIL_1>');
    expect(result.text).not.toContain('user@example.com');
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].original).toBe('user@example.com');
  });

  it('replaces Colombian phone', () => {
    const result = anonymizePII('mi celular es 3201234567', SALT);
    expect(result.text).toContain('<PHONE_1>');
    expect(result.text).not.toContain('3201234567');
  });

  it('replaces order IDs', () => {
    const result = anonymizePII('mi pedido es PP-2024-123456', SALT);
    expect(result.text).toContain('<ORDER_1>');
    expect(result.text).not.toContain('PP-2024-123456');
  });

  it('replaces credit card number', () => {
    const result = anonymizePII('la tarjeta es 4111 1111 1111 1111', SALT);
    expect(result.text).toContain('<CARD_1>');
    expect(result.text).not.toContain('4111 1111 1111 1111');
  });

  it('returns RedactedText branded type', () => {
    const result = anonymizePII('user@example.com', SALT);
    expect(result.text).toBeTypeOf('string');
  });

  it('counts multiple occurrences of same type', () => {
    const result = anonymizePII('a@a.com y b@b.com', SALT);
    expect(result.text).toContain('<EMAIL_1>');
    expect(result.text).toContain('<EMAIL_2>');
    expect(result.tokens).toHaveLength(2);
  });

  it('returns empty tokens for clean text', () => {
    const result = anonymizePII('hola mundo', SALT);
    expect(result.text).toBe('hola mundo');
    expect(result.tokens).toHaveLength(0);
  });
});
