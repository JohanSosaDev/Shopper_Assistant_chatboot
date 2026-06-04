import { describe, it, expect } from 'vitest';
import { hashCustomerId, hashEmail } from '../../../src/lib/hashing.js';

describe('hashCustomerId', () => {
  it('returns a 64-char hex string', () => {
    const hash = hashCustomerId('cust-123', 'test-salt');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns same hash for same input', () => {
    expect(hashCustomerId('cust-123', 'test-salt'))
      .toEqual(hashCustomerId('cust-123', 'test-salt'));
  });

  it('returns different hash for different salt', () => {
    expect(hashCustomerId('cust-123', 'salt-a'))
      .not.toEqual(hashCustomerId('cust-123', 'salt-b'));
  });
});

describe('hashEmail', () => {
  it('normalizes before hashing', () => {
    const a = hashEmail('User@Example.COM', 'salt');
    const b = hashEmail('user@example.com', 'salt');
    expect(a).toEqual(b);
  });

  it('trims whitespace', () => {
    const a = hashEmail('user@example.com', 'salt');
    const b = hashEmail('  user@example.com  ', 'salt');
    expect(a).toEqual(b);
  });
});
