import { describe, it, expect, vi } from 'vitest';
import { withRetry, RetryExhaustedError } from '../../../src/lib/retry.js';

const OPTS = { maxAttempts: 3, baseDelayMs: 10, factor: 2, retryableErrors: () => true };

describe('withRetry', () => {
  it('succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, OPTS)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce('ok');

    await expect(withRetry(fn, OPTS)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws last error after exhausting attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent'));
    await expect(withRetry(fn, OPTS)).rejects.toThrow('persistent');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fatal'));
    const opts = { ...OPTS, retryableErrors: (e: unknown) => (e as Error).message !== 'fatal' };

    await expect(withRetry(fn, opts)).rejects.toThrow('fatal');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
