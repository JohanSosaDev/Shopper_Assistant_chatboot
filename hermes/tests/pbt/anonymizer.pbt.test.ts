import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { anonymizePII } from '../../src/lib/pii-anonymizer.js';

describe('PII anonymizer (property-based)', () => {
  it('never contains raw email after anonymization', () => {
    fc.assert(
      fc.property(
        fc.emailAddress().filter((e) => /^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(e)),
        fc.string(),
        (email, salt) => {
          const text = `mi correo es ${email}`;
          const result = anonymizePII(text, salt);
          expect(result.text).not.toContain(email);
          expect(result.tokens).toHaveLength(1);
          expect(result.tokens[0].original).toBe(email);
          expect(result.tokens[0].token).toMatch(/^<EMAIL_\d+>$/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('idempotent: second pass does not add more tokens', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 10, maxLength: 200 }), fc.string(), (text, salt) => {
        const first = anonymizePII(text, salt);
        const second = anonymizePII(first.text, salt);
        expect(second.tokens).toHaveLength(0);
      }),
      { numRuns: 50 },
    );
  });

  it('tokens are never empty', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 500 }), fc.string(), (text, salt) => {
        const result = anonymizePII(text, salt);
        for (const token of result.tokens) {
          expect(token.original.length).toBeGreaterThan(0);
          expect(token.token.length).toBeGreaterThan(0);
          expect(token.hash.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 50 },
    );
  });
});
