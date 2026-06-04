import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withCircuitBreaker, CircuitBreakerOpenError, resetAllBreakers } from '../../../src/lib/circuit-breaker.js';

const OPTS = { failureThreshold: 2, openMs: 100, halfOpenMaxAttempts: 2 };

describe('withCircuitBreaker', () => {
  beforeEach(() => resetAllBreakers());

  it('calls fn and returns result on success', async () => {
    const result = await withCircuitBreaker('test', () => Promise.resolve('ok'), OPTS);
    expect(result).toBe('ok');
  });

  it('opens after failureThreshold failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withCircuitBreaker('test', fn, OPTS)).rejects.toThrow('fail');
    await expect(withCircuitBreaker('test', fn, OPTS)).rejects.toThrow('fail');
    await expect(withCircuitBreaker('test', fn, OPTS)).rejects.toThrow(CircuitBreakerOpenError);
  });

  it('transitions to half-open after openMs', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withCircuitBreaker('test', fn, OPTS)).rejects.toThrow('fail');
    await expect(withCircuitBreaker('test', fn, OPTS)).rejects.toThrow('fail');
    await expect(withCircuitBreaker('test', fn, OPTS)).rejects.toThrow(CircuitBreakerOpenError);

    await new Promise((r) => setTimeout(r, 150));
  });

  it('closes on successful half-open probe', async () => {
    let fail = true;
    const fn = vi.fn().mockImplementation(() => {
      if (fail) return Promise.reject(new Error('fail'));
      return Promise.resolve('recovered');
    });

    await expect(withCircuitBreaker('test', fn, OPTS)).rejects.toThrow('fail');
    await expect(withCircuitBreaker('test', fn, OPTS)).rejects.toThrow('fail');
    await expect(withCircuitBreaker('test', fn, OPTS)).rejects.toThrow(CircuitBreakerOpenError);

    await new Promise((r) => setTimeout(r, 600));

    fail = false;
    const result = await withCircuitBreaker('test', fn, OPTS);
    expect(result).toBe('recovered');
  }, 3000);
});
